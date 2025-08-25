import Foundation
import UIKit

@objc(CameraModule)
class CameraModule: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc(openCamera:rejecter:)
  func openCamera(_ resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let rootVC = UIApplication.shared.delegate?.window??.rootViewController else {
        reject("E_NO_VIEW", "Não foi possível acessar a rootViewController", nil)
        return
      }

      if UIImagePickerController.isSourceTypeAvailable(.camera) {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.allowsEditing = false
        rootVC.present(picker, animated: true) {
          resolve("Câmera aberta com sucesso")
        }
      } else {
        reject("E_NO_CAMERA", "Câmera não disponível neste dispositivo", nil)
      }
    }
  }
}