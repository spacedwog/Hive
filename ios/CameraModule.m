#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CameraModule, NSObject)
RCT_EXTERN_METHOD(launchCamera:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end