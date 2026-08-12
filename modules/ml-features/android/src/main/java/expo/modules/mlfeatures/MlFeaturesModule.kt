package expo.modules.mlfeatures

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.Rect
import android.net.Uri
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
import kotlinx.coroutines.tasks.await

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

  private fun japaneseCharScore(text: String): Int =
    text.count { c -> c.code in 0x3040..0x30FF || c.code in 0x4E00..0x9FFF }

  private fun blockItem(box: Rect?, text: String, effectiveScale: Float): Map<String, Any?> =
    mapOf(
      "text" to text,
      "x" to ((box?.left ?: 0) / effectiveScale).toInt(),
      "y" to ((box?.top ?: 0) / effectiveScale).toInt(),
      "width" to ((box?.width() ?: 0) / effectiveScale).toInt(),
      "height" to ((box?.height() ?: 0) / effectiveScale).toInt()
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
      val originalBitmap = path?.let { BitmapFactory.decodeFile(it) }
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
        Bitmap.createScaledBitmap(
          it,
          (it.width * scaleFactor).toInt(),
          (it.height * scaleFactor).toInt(),
          true
        )
      }
      val effectiveScale = if (scaledBitmap != null) scaleFactor else 1f
      val image = scaledBitmap?.let { InputImage.fromBitmap(it, 0) }
        ?: InputImage.fromFilePath(context, Uri.parse(imageUri))

      val result = textRecognizer.process(image).await()
      // Group by ML Kit's own block (paragraph) instead of individual lines, so a
      // dish name that wraps to two lines stays one item instead of being split into
      // two unrelated fragments that each translate to garbage.
      val horizontalItems = result.textBlocks.map { block ->
        blockItem(block.boundingBox, block.lines.joinToString(" ") { it.text }, effectiveScale)
      }

      // ML Kit's recognizer is built for horizontal text; traditional Japanese vertical
      // signage/menus (tategaki, top-to-bottom columns) mostly comes back empty or
      // garbled. Rotate the same (already-upscaled) bitmap 90deg CCW so vertical
      // columns become horizontal lines, run the same recognizer again, and map the
      // boxes back. Whichever orientation actually found more Japanese text wins --
      // a menu is essentially always one or the other, not a mix.
      val verticalItems = scaledBitmap?.let { preRotate ->
        val rotated = Bitmap.createBitmap(
          preRotate, 0, 0, preRotate.width, preRotate.height,
          Matrix().apply { postRotate(-90f) }, true
        )
        val rotatedResult = textRecognizer.process(InputImage.fromBitmap(rotated, 0)).await()
        rotatedResult.textBlocks.map { block ->
          val text = block.lines.joinToString(" ") { it.text }
          blockItem(unrotateBox(block.boundingBox, preRotate.width), text, effectiveScale)
        }
      } ?: emptyList()

      fun score(items: List<Map<String, Any?>>) =
        items.sumOf { japaneseCharScore(it["text"] as String) }

      if (score(verticalItems) > score(horizontalItems)) verticalItems else horizontalItems
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
