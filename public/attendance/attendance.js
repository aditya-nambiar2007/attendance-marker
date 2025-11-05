$(async function() {
 alert("Please Click Anywhere To Enter Full Screen Mode!")
    document.body.addEventListener('click',document.body.requestFullscreen)

document.addEventListener('fullscreenchange',(e)=>{
    if(!document.fullscreen){
        alert("This Can Only Be Done In Full Screen Mode!\nPlease Reload The Site");
        socket.disconnect()
    }

})
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
$("#loc").on('click',()=>{
    navigator.geolocation.getCurrentPosition((position)=>{
        if(position.coords.accuracy>30){
            $("#Location_check>span").text("Location accuracy is low!")
            console.log(position.coords.accuracy);
            
        }
        else{
        socket.emit("loc", {id: getParam('id'), course: getParam('course'), location: [position.coords.latitude, position.coords.longitude]})
        $("#Location_check>span").text("O")
        socket.on("locStatus", (data) => {
            if (data.status === "success") {
                $("#Location_check>span").text("Location Verified! &#10004;")
                $("#Location_check>span").css("color","green")
                setTimeout(() => {
                    $("#Location_check").slideUp()
                    $("#Code_correction").slideDown()
                }, 100);

            } else {
                $("#Location_check>span").text("Location Mismatch! &#10006;")
                $("#Location_check>span").css("color","red")
            }
        }
    )
}
    },()=>{}, {enableHighAccuracy: true, timeout: 5000, maximumAge: 0});
})

$("#code_submit").on('click',()=>{
    const code=$("#code").val()
    socket.emit("code", {id: getParam('id'), course: getParam('course'), code: code})
    socket.on("codeStatus", (data) => {
        if (data.status === "success") {
            alert("Code verified, starting face verification...")
            setTimeout(() => {
                    $("#Code_correction").slideUp()
                    $("#Face_verification").slideDown()
                }, 100);
            
        }
        else{
            alert(data.message)
        }
    })
})
let gesture;
$("QR_check").on('click',()=>{
    const qrCodeScanner = new Html5Qrcode("qr_reader");
    qrCodeScanner.start(
      { facingMode: "environment" }, // Use rear camera
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        alert(`QR Code Scanned: ${decodedText}`);
        socket.emit("code", {id: getParam('id'), course: getParam('course'), code: decodedText})
        socket.on("codeStatus", (data) => {
            if (data.status === "success") {
                alert("Code verified, starting face verification...")
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


// ...existing code...

// Initialize webcam and gesture recognition
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

