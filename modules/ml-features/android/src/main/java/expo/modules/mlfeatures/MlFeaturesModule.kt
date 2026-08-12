package expo.modules.mlfeatures

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.tasks.await

class MlFeaturesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MlFeatures")

    AsyncFunction("recognizeText").SuspendBody { imageUri: String ->
      val context = appContext.reactContext!!
      val image = InputImage.fromFilePath(context, Uri.parse(imageUri))
      val recognizer = TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
      val result = recognizer.process(image).await()
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
  }
}
