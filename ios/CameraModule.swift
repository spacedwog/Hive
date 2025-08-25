import Foundation
import UIKit
import React

@objc(CameraModule)
class CameraModule: NSObject {
  
  @objc(openCamera:rejecter:)
  func openCamera(_ resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let rootVC = UIApplication.shared.keyWindow?.rootViewController else {
        reject("E_NO_VIEW", "Não foi possível acessar a rootViewController", nil)
        return
      }

      if UIImagePickerController.isSourceTypeAvailable(.camera) {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.allowsEditing = false
        picker.delegate = rootVC as? UIImagePickerControllerDelegate & UINavigationControllerDelegate
        rootVC.present(picker, animated: true, completion: {
          resolve("Câmera aberta com sucesso")
        })
      } else {
        reject("E_NO_CAMERA", "Câmera não disponível neste dispositivo", nil)
      }
    }
  }
}