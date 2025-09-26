const getCookie=(name)=>{
if(!document.cookie){return ""}
let str="{\""+document.cookie.replace("=","\":\"").replace("; ","\",\"")+"\"}"
str=JSON.parse(str)
return str[name]
}
const getParam=name=>{
let params = new URLSearchParams(location.href);
return params.get(name);
}

//$(function() {
    $("#Code_correction").hide()
    $("#Face_verification").hide()
const socket =  io(location.origin);
$("#loc").on('click',()=>{
    navigator.geolocation.getCurrentPosition((position)=>{
        if(position.coords.accuracy>30){
            $("#Location_check>span").text("Location accuracy is low!")
        }
        else{
        socket.emit("loc", {id: getCookie('id'), course: getParam('course'), location: [position.coords.latitude, position.coords.longitude]})
        $("#Location_check>span").text("O")
        socket.on("locStatus", (data) => {
            if (data.status === "success") {
                $("#Location_check>span").text("Location Verified! &#10004;")
                $("#Location_check>span").css("color","green")
                setInterval(() => {
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
    socket.emit("code", {id: getCookie('id'), course: getParam('course'), code: code})
    socket.on("codeStatus", (data) => {
        if (data.status === "success") {
            alert("Code verified, starting face verification...")
            setInterval(() => {
                    $("#Code_correction").slideUp()
                    $("#Face_verification").slideDown()
                }, 100);
            
        }
        else{
            alert(data.message)
        }
    })
})
$("QR_check").on('click',()=>{
    const qrCodeScanner = new Html5Qrcode("qr_reader");
    qrCodeScanner.start(
      { facingMode: "environment" }, // Use rear camera
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        alert(`QR Code Scanned: ${decodedText}`);
        socket.emit("code", {id: getCookie('id'), course: getParam('course'), code: decodedText})
        socket.on("codeStatus", (data) => {
            if (data.status === "success") {
                alert("Code verified, starting face verification...")
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

$("#verify").on('click',()=>{
    
})

//})

