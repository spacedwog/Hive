import Foundation
import UIKit
import Photos

@objc(CameraModule)
class CameraModule: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {

  var resolver: RCTPromiseResolveBlock?
  var rejecter: RCTPromiseRejectBlock?

  @objc func launchCamera(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let root = UIApplication.shared.keyWindow?.rootViewController else {
        reject("NO_ROOT", "RootViewController não encontrado", nil)
        return
      }

      if !UIImagePickerController.isSourceTypeAvailable(.camera) {
        reject("NO_CAMERA", "Câmera não disponível", nil)
        return
      }

      self.resolver = resolve
      self.rejecter = reject

      let picker = UIImagePickerController()
      picker.sourceType = .camera
      picker.allowsEditing = false
      picker.delegate = self

      root.present(picker, animated: true, completion: nil)
    }
  }

  // MARK: - UIImagePickerControllerDelegate

  func imagePickerController(_ picker: UIImagePickerController,
                             didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {

    defer { picker.dismiss(animated: true, completion: nil) }

    guard let image = info[.originalImage] as? UIImage else {
      self.rejecter?("NO_IMAGE", "Nenhuma imagem capturada", nil)
      self.clearCallbacks()
      return
    }

    // Salva em arquivo temporário e retorna a URI
    let filename = "RN_\(Int(Date().timeIntervalSince1970)).jpg"
    let tmpUrl = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(filename)

    if let data = image.jpegData(compressionQuality: 0.9) {
      do {
        try data.write(to: tmpUrl)
        self.resolver?(["uri": tmpUrl.absoluteString])
      } catch {
        self.rejecter?("WRITE_ERR", "Falha ao gravar arquivo", error)
      }
    } else {
      self.rejecter?("ENCODE_ERR", "Falha ao codificar JPEG", nil)
    }

    self.clearCallbacks()
  }

  func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
    picker.dismiss(animated: true, completion: nil)
    self.rejecter?("CANCELLED", "Usuário cancelou", nil)
    self.clearCallbacks()
  }

  private func clearCallbacks() {
    self.resolver = nil
    self.rejecter = nil
  }
}