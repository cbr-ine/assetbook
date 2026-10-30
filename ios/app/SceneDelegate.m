#import "SceneDelegate.h"
#import "AppDelegate.h"

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }

  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
  UIWindowScene *windowScene = (UIWindowScene *)scene;

  // RN 0.76 在 didFinishLaunching 里已经建好 window；iOS 26 要求把它挂到 scene 上，
  // 否则 UIKit 会判定「没有采用 scene lifecycle」直接 SIGTRAP。
  if (appDelegate.window == nil) {
    appDelegate.window = [[UIWindow alloc] initWithWindowScene:windowScene];
  } else {
    appDelegate.window.windowScene = windowScene;
  }
  self.window = appDelegate.window;
  [self.window makeKeyAndVisible];
}

@end
