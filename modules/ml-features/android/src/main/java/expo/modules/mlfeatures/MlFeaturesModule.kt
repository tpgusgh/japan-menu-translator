package expo.modules.mlfeatures

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
      val image = InputImage.fromFilePath(context, Uri.parse(imageUri))
      val result = textRecognizer.process(image).await()
      result.textBlocks.flatMap { block -> block.lines }.map { line ->
        val box = line.boundingBox
        mapOf(
          "text" to line.text,
          "x" to (box?.left ?: 0),
          "y" to (box?.top ?: 0),
          "width" to (box?.width() ?: 0),
          "height" to (box?.height() ?: 0)
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
