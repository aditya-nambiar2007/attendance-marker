$(async function() {
    $("#Code_correction").hide()
    $("#Face_verification").hide()
const getParam=(param)=>{
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
let socket =  io(location.origin);
socket.emit("details", {id: getParam('id'), course: getParam('course')})
let time;
socket.on("time",e=>time=e)

$("#Qr_check").on('click',()=>{
    const qrCodeScanner = new Html5Qrcode("qr_reader");
    qrCodeScanner.start(
      { facingMode: "environment" }, // Use rear camera
      { fps: 10, qrbox: 250 },
      (decodedText) => {
          alert(`QR Code Scanned: ${decodedText}`);
          socket.emit("seat", {id: getParam('id'), course: getParam('course'), details: decodedText})
          socket.on("seatStatus", (data) => {
              if (data.status === "success") {
                alert("Seat verified, starting face verification...")
                gesture=data.gesture;
                setInterval(() => {
                    $("#Code_correction").slideUp()
                        $("#Face_verification").slideDown()
                    }, 100);
                
            }
            else{
                alert(data.message)
            }
        })
        qrCodeScanner.stop();
    },
    (error) => {
        console.warn(`Error scanning: ${error}`);
    }
);
})



// Initialize webcam and gesture recognition
let gesture;
async function initWebcam() {
    const video = document.createElement('video');
    const videoContainer = document.getElementById('video-container');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
        });
        video.srcObject = stream;
        video.autoplay = true;
        videoContainer.appendChild(video);
        return { video, stream };
    } catch (err) {
        console.error('Error accessing webcam:', err);
        return null;
    }
}

// Capture image from video stream
function captureImage(video) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg');
}

// Main verification function with gesture detection
$("#verify").on('click', async () => {
    const { video, stream } = await initWebcam();
    if (!video) {
        alert('Failed to initialize webcam');
        return;
    }

    // Create gesture recognizer
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task"
        },
        numHands: 2
    });
    const facedetector = await FaceDetector.createFromOptions(
    vision,
    {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/face_detector/face_detector.task"
      },
      runningMode: runningMode
    })

    // Start gesture detection loop
    let gestureDetected = false;
    const detectGesture = async () => {
        if (!video.videoWidth) {
            requestAnimationFrame(detectGesture);
            return;
        }

        const recognitionResult = await gestureRecognizer.recognize(video);
        const faceResult = await facedetector.detect(video);
        // Check for thumbs up gesture (adjust gesture category as needed)
        if (recognitionResult.gestures.length > 0 && 
            recognitionResult.gestures[0][0].categoryName.toLowerCase() === gesture &&
            !gestureDetected && faceResult.detections.length > 0) {
            
            gestureDetected = true;
            alert("Video Captured Successfully!")
            // Capture and process image
            const imageData = captureImage(video);
            
            // Emit to server for verification
            socket.emit('verify', {
                id: getParam('id'),
                course: getParam('course'),
                image: imageData
            });
            
            // Cleanup
            stream.getTracks().forEach(track => track.stop());
            video.remove();
            return;
        }

        if (!gestureDetected) {
            requestAnimationFrame(detectGesture);
        }
    };

    detectGesture();
});

// Handle verification response
socket.on('verificationStatus', (data) => {
    if (data.status === 'success') {
        alert('Attendance marked successfully!');
    } else {
        alert('Verification failed: ' + data.message);
    }
});
})

