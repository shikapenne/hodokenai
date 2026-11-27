import UIKit
import Capacitor
import AppTrackingTransparency

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    // Apple's tracking prompt only appears while the app is active, so ask here (once, after a short
    // pause so the first frame is on screen). Ads start only after the player has answered.
    func sceneDidBecomeActive(_ scene: UIScene) {
        if #available(iOS 14, *) {
            guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                guard UIApplication.shared.applicationState == .active,
                      ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }
                ATTrackingManager.requestTrackingAuthorization { _ in }
            }
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
