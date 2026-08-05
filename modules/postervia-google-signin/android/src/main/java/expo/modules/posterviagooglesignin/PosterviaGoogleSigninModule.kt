package expo.modules.posterviagooglesignin

import androidx.core.content.ContextCompat
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Resolves status maps and never rejects, mirroring postervia-age-assurance, so the
// JS side owns every user-facing error decision.
class PosterviaGoogleSigninModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PosterviaGoogleSignin")

    AsyncFunction("signInAsync") { serverClientId: String, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(mapOf("status" to "unavailable", "reason" to "no_activity"))
        return@AsyncFunction
      }
      val option = GetSignInWithGoogleOption.Builder(serverClientId).build()
      val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
      CredentialManager.create(activity).getCredentialAsync(
        activity,
        request,
        null,
        ContextCompat.getMainExecutor(activity),
        object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
          override fun onResult(result: GetCredentialResponse) {
            val credential = result.credential
            if (
              credential is CustomCredential &&
              credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
              try {
                val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                promise.resolve(mapOf("status" to "success", "idToken" to idToken))
              } catch (parseError: GoogleIdTokenParsingException) {
                promise.resolve(mapOf("status" to "unavailable", "reason" to "invalid_token"))
              }
            } else {
              promise.resolve(mapOf("status" to "unavailable", "reason" to "unexpected_credential"))
            }
          }

          override fun onError(e: GetCredentialException) {
            val payload = when (e) {
              is GetCredentialCancellationException -> mapOf("status" to "cancelled")
              is NoCredentialException -> mapOf("status" to "no_credential")
              else -> mapOf("status" to "unavailable", "reason" to e.type)
            }
            promise.resolve(payload)
          }
        },
      )
    }

    AsyncFunction("signOutAsync") { promise: Promise ->
      val context = appContext.reactContext?.applicationContext
      if (context == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      CredentialManager.create(context).clearCredentialStateAsync(
        ClearCredentialStateRequest(),
        null,
        ContextCompat.getMainExecutor(context),
        object : CredentialManagerCallback<Void?, ClearCredentialException> {
          override fun onResult(result: Void?) {
            promise.resolve(true)
          }

          override fun onError(e: ClearCredentialException) {
            promise.resolve(false)
          }
        },
      )
    }
  }
}
