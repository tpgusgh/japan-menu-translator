package expo.modules.mlfeatures

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.content.Intent
import android.graphics.Rect
import android.media.ExifInterface
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Base64
import java.io.ByteArrayOutputStream
import com.atilika.kuromoji.ipadic.Tokenizer
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.tasks.await
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class MlFeaturesModule : Module() {
  private val kuromojiTokenizer by lazy { Tokenizer() }
  private val textRecognizer by lazy {
    TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
  }
  private val translators = mutableMapOf<String, com.google.mlkit.nl.translate.Translator>()

  private fun getOrCreateTranslator(from: String, to: String): com.google.mlkit.nl.translate.Translator {
    val key = "$from>$to"
    return translators.getOrPut(key) {
      Translation.getClient(
        TranslatorOptions.Builder()
          .setSourceLanguage(langTag(from))
          .setTargetLanguage(langTag(to))
          .build()
      )
    }
  }

  private fun langTag(lang: String): String =
    when (lang) {
      "ja" -> TranslateLanguage.JAPANESE
      "ko" -> TranslateLanguage.KOREAN
      else -> throw IllegalArgumentException("Unsupported language: $lang")
    }

  // BitmapFactory.decodeFile ignores EXIF orientation -- a real photo taken in
  // portrait often has its pixels stored landscape with an EXIF tag saying "rotate
  // 90". Without this, OCR sees text sideways/upside-down and misreads or drops it
  // entirely. Runs once before upscaling/block-detection so both the horizontal and
  // vertical detection passes downstream get correctly-oriented pixels.
  private fun applyExifOrientation(bitmap: Bitmap, path: String): Bitmap {
    val orientation = try {
      ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    } catch (e: Exception) {
      ExifInterface.ORIENTATION_NORMAL
    }
    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> { matrix.postRotate(90f); matrix.postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_TRANSVERSE -> { matrix.postRotate(270f); matrix.postScale(-1f, 1f) }
      else -> return bitmap
    }
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
  }

  // Grayscale + contrast stretch: glare/low-contrast menus (red-on-wood, faded paper)
  // are the usual reason ML Kit drops or garbles lines. Pivot at mid-gray so dark text
  // gets darker and light background lighter; saturation 0 removes colored backgrounds.
  private fun boostContrast(src: Bitmap): Bitmap {
    val contrast = 1.35f
    val shift = 128f * (1f - contrast)
    val matrix = ColorMatrix().apply { setSaturation(0f) }
    matrix.postConcat(ColorMatrix(floatArrayOf(
      contrast, 0f, 0f, 0f, shift,
      0f, contrast, 0f, 0f, shift,
      0f, 0f, contrast, 0f, shift,
      0f, 0f, 0f, 1f, 0f
    )))
    val out = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
    Canvas(out).drawBitmap(src, 0f, 0f, Paint().apply { colorFilter = ColorMatrixColorFilter(matrix) })
    return out
  }

  private fun japaneseCharScore(text: String): Int =
    text.count { c -> c.code in 0x3040..0x30FF || c.code in 0x4E00..0x9FFF }

  private fun blockItem(box: Rect?, text: String, effectiveScale: Float, orientation: String): Map<String, Any?> =
    mapOf(
      "text" to text,
      "x" to ((box?.left ?: 0) / effectiveScale).toInt(),
      "y" to ((box?.top ?: 0) / effectiveScale).toInt(),
      "width" to ((box?.width() ?: 0) / effectiveScale).toInt(),
      "height" to ((box?.height() ?: 0) / effectiveScale).toInt(),
      "orientation" to orientation
    )

  // Maps a bounding box from a 90deg-counterclockwise-rotated bitmap back to the
  // pre-rotation bitmap's coordinate space. `preRotateWidth` is the width of the
  // bitmap *before* rotation (Bitmap.createBitmap swaps width/height on rotation).
  private fun unrotateBox(box: Rect?, preRotateWidth: Int): Rect? =
    box?.let {
      Rect(
        preRotateWidth - it.top - it.height(),
        it.left,
        preRotateWidth - it.top,
        it.left + it.width()
      )
    }

  override fun definition() = ModuleDefinition {
    Name("MlFeatures")

    AsyncFunction("recognizeText").SuspendBody { imageUri: String ->
      val context = appContext.reactContext!!
      val path = Uri.parse(imageUri).path
      val originalBitmap = path?.let { p ->
        BitmapFactory.decodeFile(p)?.let { decoded ->
          val oriented = applyExifOrientation(decoded, p)
          if (oriented !== decoded) decoded.recycle()
          oriented
        }
      }
      // Target a consistently high effective resolution for OCR regardless of the
      // source photo's native size: small/dense menu text needs more pixels than a
      // photo may already have. Real phone cameras often already exceed this, so this
      // skips pointless (and memory-risky) upscaling on already-sharp photos while
      // still boosting low-res ones -- capped at 4x so a tiny/blurry source doesn't
      // blow up into a huge bitmap for no accuracy gain.
      val targetLongSide = 4500
      val scaleFactor = originalBitmap?.let {
        val longSide = maxOf(it.width, it.height)
        (targetLongSide.toFloat() / longSide).coerceIn(1f, 4f)
      } ?: 1f

      val scaledBitmap = originalBitmap?.let {
        val scaled = Bitmap.createScaledBitmap(
          it,
          (it.width * scaleFactor).toInt(),
          (it.height * scaleFactor).toInt(),
          true
        )
        boostContrast(scaled)
      }
      val effectiveScale = if (scaledBitmap != null) scaleFactor else 1f
      val image = scaledBitmap?.let { InputImage.fromBitmap(it, 0) }
        ?: InputImage.fromFilePath(context, Uri.parse(imageUri))

      // ML Kit's recognizer is built for horizontal text; traditional Japanese vertical
      // signage/menus (tategaki, top-to-bottom columns) mostly comes back empty or
      // garbled. So this always also tries a 90deg-CCW-rotated pass and picks whichever
      // orientation actually found more Japanese text -- a menu is essentially always
      // one or the other, not a mix. Both ML Kit inference calls are independent (one
      // runs on `image`, the other on the pre-rotated bitmap), so they're launched
      // together via `async` and awaited together instead of one full pass blocking
      // before the next starts -- same two passes, no accuracy path skipped, just not
      // serialized.
      val rotatedBitmap = scaledBitmap?.let { preRotate ->
        Bitmap.createBitmap(
          preRotate, 0, 0, preRotate.width, preRotate.height,
          Matrix().apply { postRotate(-90f) }, true
        )
      }

      val (horizontalItems, verticalItems) = coroutineScope {
        val horizontalDeferred = async {
          val result = textRecognizer.process(image).await()
          // Group by ML Kit's own block (paragraph) instead of individual lines, so a
          // dish name that wraps to two lines stays one item instead of being split
          // into two unrelated fragments that each translate to garbage.
          result.textBlocks.map { block ->
            blockItem(block.boundingBox, block.lines.joinToString(" ") { it.text }, effectiveScale, "horizontal")
          }
        }
        val verticalDeferred = async {
          rotatedBitmap?.let { rotated ->
            val rotatedResult = textRecognizer.process(InputImage.fromBitmap(rotated, 0)).await()
            rotatedResult.textBlocks.map { block ->
              val text = block.lines.joinToString(" ") { it.text }
              blockItem(unrotateBox(block.boundingBox, scaledBitmap!!.width), text, effectiveScale, "vertical")
            }
          } ?: emptyList()
        }
        horizontalDeferred.await() to verticalDeferred.await()
      }

      fun score(items: List<Map<String, Any?>>) =
        items.sumOf { japaneseCharScore(it["text"] as String) }

      // Horizontal is the common case (most menus, and *every* other kind of text
      // in a photo -- signage, receipts, UI chrome). A close score is more likely
      // noise than a real vertical menu, so only flip to vertical when it clearly
      // reads better, not just barely edges the horizontal pass out.
      if (score(verticalItems) > score(horizontalItems) * 1.3) verticalItems else horizontalItems
    }

    // Draws numbered circular markers onto the photo at each given box's center and
    // returns a base64 JPEG. Used to give a vision LLM unambiguous spatial grounding
    // for "item N" in a single request/image, instead of a flat text list it has to
    // blindly match against a busy photo (unreliable once there are dozens of items).
    AsyncFunction("drawNumberedMarkers") { imageUri: String, boxes: List<Map<String, Int>> ->
      val path = Uri.parse(imageUri).path
      val original = path?.let { BitmapFactory.decodeFile(it) }
        ?: throw IllegalArgumentException("cannot decode image: $imageUri")
      val mutable = original.copy(Bitmap.Config.ARGB_8888, true)
      val canvas = Canvas(mutable)
      val radius = minOf(mutable.width, mutable.height) * 0.018f
      val circlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.RED }
      val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = radius * 0.15f
      }
      val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
        textSize = radius * 1.15f
      }

      boxes.forEachIndexed { index, box ->
        val cx = (box["x"] ?: 0) + (box["width"] ?: 0) / 2f
        val cy = (box["y"] ?: 0) + (box["height"] ?: 0) / 2f
        canvas.drawCircle(cx, cy, radius, circlePaint)
        canvas.drawCircle(cx, cy, radius, borderPaint)
        val label = (index + 1).toString()
        val textY = cy - (textPaint.descent() + textPaint.ascent()) / 2
        canvas.drawText(label, cx, textY, textPaint)
      }

      val output = ByteArrayOutputStream()
      mutable.compress(Bitmap.CompressFormat.JPEG, 85, output)
      Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
    }

    AsyncFunction("isModelDownloaded").SuspendBody { lang: String ->
      val model = TranslateRemoteModel.Builder(langTag(lang)).build()
      RemoteModelManager.getInstance().isModelDownloaded(model).await()
    }

    AsyncFunction("downloadModel").SuspendBody { lang: String ->
      val model = TranslateRemoteModel.Builder(langTag(lang)).build()
      val conditions = DownloadConditions.Builder().build()
      RemoteModelManager.getInstance().download(model, conditions).await()
    }

    AsyncFunction("translateText").SuspendBody { text: String, from: String, to: String ->
      val translator = getOrCreateTranslator(from, to)
      translator.translate(text).await()
    }

    // One-shot voice input: listens once, returns the recognized text (or throws on
    // error/timeout). SpeechRecognizer must be created/driven from the main thread,
    // so this hops onto the main looper and bridges its callback API into a
    // coroutine the JS side can just await.
    AsyncFunction("recognizeSpeech").SuspendBody { locale: String ->
      val context = appContext.reactContext!!
      suspendCancellableCoroutine<String> { cont ->
        Handler(Looper.getMainLooper()).post {
          if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            cont.resumeWithException(IllegalStateException("speech recognition unavailable on this device"))
            return@post
          }
          val recognizer = SpeechRecognizer.createSpeechRecognizer(context)
          val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
          }
          recognizer.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle) {
              val text = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
              recognizer.destroy()
              if (cont.isActive) cont.resume(text)
            }
            override fun onError(error: Int) {
              recognizer.destroy()
              if (cont.isActive) cont.resumeWithException(RuntimeException("speech recognition error code $error"))
            }
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
          })
          recognizer.startListening(intent)
          cont.invokeOnCancellation { recognizer.destroy() }
        }
      }
    }

    AsyncFunction("getReadings") { text: String ->
      kuromojiTokenizer.tokenize(text).map { token ->
        val reading = token.reading
        mapOf(
          "surface" to token.surface,
          "reading" to (if (reading.isNullOrEmpty() || reading == "*") token.surface else reading)
        )
      }
    }

    OnDestroy {
      textRecognizer.close()
      translators.values.forEach { it.close() }
    }
  }
}
