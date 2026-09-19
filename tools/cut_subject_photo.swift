// Lift the person out of a photo with macOS Vision (no downloads). Used for the hero lab's Kai cutout.
// swiftc -O tools/cut_subject_photo.swift -o /tmp/lift && /tmp/lift source/photos/kai.png out.png 0.55 0.5
// The last two numbers pick the person under that point (0..1 of width, height) when several are found.
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let input = URL(fileURLWithPath: args[1]), output = URL(fileURLWithPath: args[2])
guard let src = CGImageSourceCreateWithURL(input as CFURL, nil), let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("read") }
let handler = VNImageRequestHandler(cgImage: cg)
let req = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([req])
guard let obs = req.results?.first else { fatalError("no subject") }
print("instances:", obs.allInstances.count)
// Keep only the instance under the image centre-right (Kai), not the friend at the edge.
var chosen = obs.allInstances
if args.count > 3 {
  let px = CGFloat(Double(args[3])!), py = CGFloat(Double(args[4])!)
  let lab = obs.instanceMask
  CVPixelBufferLockBaseAddress(lab, .readOnly)
  let w = CVPixelBufferGetWidth(lab), h = CVPixelBufferGetHeight(lab)
  let row = CVPixelBufferGetBytesPerRow(lab)
  let base = CVPixelBufferGetBaseAddress(lab)!.assumingMemoryBound(to: UInt8.self)
  let v = base[Int(py * CGFloat(h)) * row + Int(px * CGFloat(w))]
  CVPixelBufferUnlockBaseAddress(lab, .readOnly)
  print("instance at point:", v)
  chosen = IndexSet(integer: Int(v))
}
let masked = try obs.generateMaskedImage(ofInstances: chosen, from: handler, croppedToInstancesExtent: true)
let ci = CIImage(cvPixelBuffer: masked)
let ctx = CIContext()
guard let out = ctx.createCGImage(ci, from: ci.extent) else { fatalError("render") }
let dest = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, out, nil)
CGImageDestinationFinalize(dest)
print("wrote", out.width, out.height)
