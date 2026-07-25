package expo.modules.posterviaageassurance

import com.google.android.play.agesignals.AgeSignalsAccessRequest
import com.google.android.play.agesignals.AgeSignalsManager
import com.google.android.play.agesignals.AgeSignalsManagerFactory
import com.google.android.play.agesignals.AgeSignalsRequest
import com.google.android.play.agesignals.model.AgeSignalsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.types.Queues

class PosterviaAgeAssuranceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PosterviaAgeAssurance")

    AsyncFunction("requestAgeRangeAsync") { promise: Promise ->
      val activity = appContext.currentActivity
      val applicationContext = appContext.reactContext?.applicationContext
      if (activity == null || applicationContext == null) {
        promise.resolve(mapOf("status" to "unavailable"))
        return@AsyncFunction
      }

      val manager = AgeSignalsManagerFactory.create(applicationContext)
      val accessRequest = AgeSignalsAccessRequest.builder()
        .setActivity(activity)
        .build()

      manager.requestAgeSignalsAccess(accessRequest)
        .addOnSuccessListener { accessResult ->
          when (accessResult.ageSignalsStatus()) {
            AgeSignalsStatus.SHARED -> retrieveAgeRange(manager, promise)
            AgeSignalsStatus.NOT_SHARED -> promise.resolve(mapOf("status" to "not_shared"))
            AgeSignalsStatus.VERIFICATION_REQUIRED -> promise.resolve(
              mapOf("status" to "verification_required")
            )
            else -> promise.resolve(mapOf("status" to "unavailable"))
          }
        }
        .addOnFailureListener {
          promise.resolve(mapOf("status" to "unavailable"))
        }
    }.runOnQueue(Queues.MAIN)
  }

  private fun retrieveAgeRange(manager: AgeSignalsManager, promise: Promise) {
    manager.checkAgeSignals(AgeSignalsRequest.builder().build())
      .addOnSuccessListener { result ->
        promise.resolve(
          mapOf<String, Any?>(
            "status" to "shared",
            "lowerBound" to result.ageLower(),
            "upperBound" to result.ageUpper(),
          )
        )
      }
      .addOnFailureListener {
        promise.resolve(mapOf("status" to "unavailable"))
      }
  }
}
