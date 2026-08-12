package expo.modules.mlfeatures

import android.graphics.Bitmap
import android.graphics.BitmapFactory
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

      val (image, effectiveScale) = if (originalBitmap != null) {
        val scaledBitmap = Bitmap.createScaledBitmap(
          originalBitmap,
          (originalBitmap.width * scaleFactor).toInt(),
          (originalBitmap.height * scaleFactor).toInt(),
          true
        )
        InputImage.fromBitmap(scaledBitmap, 0) to scaleFactor
      } else {
        InputImage.fromFilePath(context, Uri.parse(imageUri)) to 1f
      }

      val result = textRecognizer.process(image).await()
      // Group by ML Kit's own block (paragraph) instead of individual lines, so a
      // dish name that wraps to two lines stays one item instead of being split into
      // two unrelated fragments that each translate to garbage.
      result.textBlocks.map { block ->
        val box = block.boundingBox
        val text = block.lines.joinToString(" ") { it.text }
        mapOf(
          "text" to text,
          "x" to ((box?.left ?: 0) / effectiveScale).toInt(),
          "y" to ((box?.top ?: 0) / effectiveScale).toInt(),
          "width" to ((box?.width() ?: 0) / effectiveScale).toInt(),
          "height" to ((box?.height() ?: 0) / effectiveScale).toInt()
        )
      }
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
