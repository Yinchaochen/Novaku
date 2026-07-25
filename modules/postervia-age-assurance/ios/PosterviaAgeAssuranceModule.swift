import DeclaredAgeRange
import ExpoModulesCore
import UIKit

public class PosterviaAgeAssuranceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PosterviaAgeAssurance")

    AsyncFunction("requestAgeRangeAsync") { (promise: Promise) in
      guard #available(iOS 26.0, *) else {
        promise.resolve(["status": "unavailable"])
        return
      }
      guard let viewController = appContext?.utilities?.currentViewController() else {
        promise.resolve(["status": "unavailable"])
        return
      }

      Task { @MainActor in
        do {
          let response = try await AgeRangeService.shared.requestAgeRange(
            ageGates: 16,
            in: viewController
          )
          switch response {
          case let .sharing(ageRange):
            promise.resolve([
              "status": "shared",
              "lowerBound": ageRange.lowerBound,
              "upperBound": ageRange.upperBound,
            ] as [String: Any?])
          case .declinedSharing:
            promise.resolve(["status": "not_shared"])
          }
        } catch {
          promise.resolve(["status": "unavailable"])
        }
      }
    }.runOnQueue(.main)
  }
}
