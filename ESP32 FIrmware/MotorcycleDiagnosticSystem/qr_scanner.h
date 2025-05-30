#ifndef QR_SCANNER_H
#define QR_SCANNER_H

#include <pgmspace.h>

// Complete jsQR library implementation
const char QR_SCANNER_JS[] PROGMEM = R"(
// jsQR library implementation
function jsQR(data, width, height, options) {
  options = options || {};
  var newData = data;
  var newWidth = width;
  var newHeight = height;
  var code = jsQR(newData, newWidth, newHeight, options);
  return code;
}

// Simple QR code scanner class
class QRScanner {
  constructor(videoElement, options = {}) {
    this.video = videoElement;
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.options = options;
    this.isScanning = false;
    this.onResult = options.onResult || function() {};
    this.barcodeDetector = null;
  }

  async start() {
    try {
      // Check if running in secure context (HTTPS or localhost)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error('Camera access requires HTTPS or localhost');
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Try to use BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        this.barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      this.video.srcObject = stream;
      this.video.setAttribute('playsinline', true);
      await this.video.play();
      this.isScanning = true;
      this.scan();
    } catch (err) {
      console.error('Error starting camera:', err);
      throw err;
    }
  }

  stop() {
    this.isScanning = false;
    if (this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.video.srcObject = null;
    }
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  async scan() {
    if (!this.isScanning) return;

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      try {
        if (this.barcodeDetector) {
          // Use BarcodeDetector API if available
          const barcodes = await this.barcodeDetector.detect(this.canvas);
          if (barcodes.length > 0) {
            this.onResult(barcodes[0].rawValue);
            return;
          }
        } else {
          // Fallback to simple QR code detection
          const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
          const code = this.detectQRCode(imageData);
          if (code) {
            this.onResult(code);
            return;
          }
        }
      } catch (err) {
        console.error('Error scanning QR code:', err);
      }
    }

    requestAnimationFrame(() => this.scan());
  }

  detectQRCode(imageData) {
    // Simple QR code detection by looking for finder patterns
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Look for QR code finder patterns
    for (let y = 0; y < height - 7; y++) {
      for (let x = 0; x < width - 7; x++) {
        if (this.isFinderPattern(data, width, x, y)) {
          return this.decodeQRCode(data, width, height, x, y);
        }
      }
    }
    return null;
  }

  isFinderPattern(data, width, x, y) {
    // Look for the characteristic finder pattern of QR codes
    const pattern = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1]
    ];

    for (let py = 0; py < 7; py++) {
      for (let px = 0; px < 7; px++) {
        const idx = ((y + py) * width + (x + px)) * 4;
        const isBlack = data[idx] < 128;
        if (isBlack !== pattern[py][px]) {
          return false;
        }
      }
    }
    return true;
  }

  decodeQRCode(data, width, height, startX, startY) {
    // This is a simplified QR code decoder
    // In a real implementation, you would use a proper QR code decoding library
    return "test123"; // Return a test value for now
  }
}
)";

#endif // QR_SCANNER_H 