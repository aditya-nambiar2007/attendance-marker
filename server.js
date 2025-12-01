const express = require("express");
const http = require("http");
const hash = (pwd) => require("crypto").createHash('sha256').update(pwd + 'iitrpr').digest('hex')

const socketIo = require("socket.io");
const path = require("path");
const db = require("./database.js").default
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const random = require("./random");
const parser = require("body-parser");
const cookie = require('cookie-parser');
const ck = require("cookie")
//const mailer=require("nodemailer")
const PORT = 3000;
const compare_faces = (img1, img2) => {
    let prediction;
    const req = http.request({
        hostname: "localhost",
        port: 3000,
        path: "/predict",
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    }
        , res => {
            let response;
            res.on("data", (data) => {
                response = data.toString()
            })
            res.on("end", () => {
                prediction = response;
            })
        })
    req.write(JSON.stringify({ img1: img1, img2: img2 }))
    req.end()
    req.on("error", (err) => {
        console.log(err)
    })
    return prediction;
}

app.use(express.json());
app.use(cookie())
app.use(express.urlencoded({ extended: true }));
app.use(parser.urlencoded({ extended: true }));
app.use(parser.raw({ type: 'application/json' }));
app.use(parser.json());
app.use(express.static(path.join(__dirname, "public")));
// Faculty dashboard 
app.get("/", (req, res) => { res.write("<script>window.location.replace('/dashboard')</script>"); res.end() })

app.get("/cookie", (req, res) => {
    res.send(req.cookies[req.query.param])
}
)

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "/home.html"));
}
)
app.get("/content/pfps", async (req, res) => {
    const data = await db[req.query.type].id(req.query.id)
    let result = data.Image.split(',')
    let header;
    if (result[0].includes("image/jpg")) { header = "image/jpg" }
    else if (result[0].includes("image/jpeg")) { header = "image/jpeg" }
    else if (result[0].includes("image/png")) { header = "image/png" }
    else { }
    res.setHeader("content-type", header)
    res.send(Buffer.from(result[1], 'base64'))

}
)

app.get("/admin", (req, res) => {

    if(req.cookies.role==="admin"&&req.query.room){
        res.sendFile(path.join(__dirname, "public/admin", "/admin_seat_add.html"));
    }
    else if(req.cookies.role==="admin"&&!req.query.room){
        res.sendFile(path.join(__dirname, "public/admin", "/admin.html"));
    }
    else{
        res.sendFile(path.join(__dirname, "public/admin", "/admin_login.html"));
    }
})


app.get("/api/rooms", async (req, res) => {
    const data = await db.room.find({})
    let response = []
    for (let i = 0; i < data.length; i++) {
        response.push({ name: data[i].name })
    }
    res.json(response);
})

app.get("/api/room_details", async (req, res) => {
    const data = await db.room.find(req.query.room)
    data[0].capacity = data[0].seats.length
    res.json(data[0]);
})


app.get("/signout", (req, res) => {
    res.clearCookie("name")
    res.clearCookie("email")
    res.clearCookie("role")
    res.clearCookie("pfp")
    res.clearCookie("id")
    res.redirect("/register#login")
})

app.get("/lib/cookie.js", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "cookie.js"))
})

app.get("/cookie", (req, res) => {
    res.send(req.cookies[req.query.param])
})

app.get("/dashboard/faculty", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "/faculty/faculty.html"));
});
app.get("/cred_change", async (req, res) => {
    res.sendFile(path.join(__dirname, "public", "/change.html"));
})
// Student dashboard route
app.get("/dashboard/student", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "/student/student.html"));
});
// Root route
app.get("/dashboard/attendance", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "/attendance/attendance.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "/register.html"));
});

app.get("/facultyDetails", async (req, res) => {
    try {
        const data = await db.faculty.id(req.cookies.id);
        if (!data) return res.status(404).json({ error: "Faculty not found" });

        const codes = Array.isArray(data.courses) ? data.courses : [];
        if (codes.length === 0) return res.json([]);

        // Fetch all course docs in parallel and extract first result from each find()
        const finds = codes.map(code => db.course.find({ code }));
        const results = await Promise.all(finds);
        const arr = results.map(r => r && r[0]).filter(Boolean);

        res.json(arr);
    } catch (err) {
        console.error("facultyDetails error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/courseDetails", async (req, res) => {
    let data;
    //console.table(req.query)
    try {
        const dat = await db.course.find({ course_code: req.query.course_code });
        if (!dat) return res.status(404).json({ error: "Course not found" })
        data = await db.class(req.query.course_code).ret_all()
        data.sort((a, b) => b.start - a.start)
    }
    catch (err) {
        console.error(err)
        res.status(500).json({ error: "Error Finding Course" })
    }
    res.json(data)
})


app.get("/studentDetails", async (req, res) => {
    try {
        const data = await db.student.id(req.cookies.id);
        if (!data) return res.status(404).json({ error: "Student not found" });

        const codes = Array.isArray(data.courses) ? data.courses : [];
        if (codes.length === 0) return res.json([]);

        const finds = codes.map(code => db.course.find({ code }));
        const results = await Promise.all(finds);
        const arr = results.map(r => r && r[0]).filter(Boolean);
        arr[0].faculty_email = await db.faculty.find({ email: arr[0].faculty_email })
        res.json(arr);
    } catch (err) {
        console.error("studentDetails error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/login", async (req, res) => {
    // Use req.body for POST data
    const { email, password, userRole } = req.body;
    // Find user by email
    const users = userRole!=='admin'?await db[userRole].find({ email: email }):{};
    const user = users && users[0];
    if (user && user.password === hash(password)&&userRole!='admin') {
        res.cookie("name", user.name, { httpOnly: true });
        res.cookie("email", user.email, { httpOnly: true });
        res.cookie("role", userRole, { httpOnly: true });
        res.cookie("id", user.id, { httpOnly: true });
        res.redirect("/dashboard/" + userRole);
    } 
    else if(userRole==='admin'){
        console.log(hash(password));
        
        res.cookie("role",hash(password)==="3734422b884b270fef67cd3b12c2b49cadd0c988e150241eb8946fd8a01896d6"?"admin":"",{maxAge:36000000})//admin@iitrpr
        res.redirect("/admin")
    }
    else {
        //res.json({ status: "failure", message: "Invalid email or password." });
        res.redirect("/register#loginError");
    }
});

// Handle registration form submission
app.post("/register", async (req, res) => {
    const { email, password, userRole, fullName, pfp } = req.body;
    // Check if user already exists
    const users = await db[userRole].find({ email: email });
    if (users && users.length > 0) {
        //res.json({ status: "failure", message: "User already exists." });
        res.redirect("/register#registerError");
        return

    } else {
        await db[userRole].create({ name: fullName, email: email, password: hash(password), courses: [], Image: pfp });
        if (userRole === 'faculty') {
            const id = await db.faculty.find({ email: email });
            res.cookie("name", fullName, { httpOnly: true });
            res.cookie("email", email, { httpOnly: true });
            res.cookie("role", userRole, { httpOnly: true });
            res.cookie("id", id[0].id, { httpOnly: true });

        }
        if (userRole === 'student') {
            const id = await db.student.find({ email: email });
            res.cookie("name", fullName, { httpOnly: true });
            res.cookie("email", email, { httpOnly: true });
            res.cookie("role", userRole, { httpOnly: true });
            res.cookie("id", id[0].id, { httpOnly: true });
        }
        res.redirect("/dashboard/" + userRole);
    }
});

//respond to post requests
app.post("/api/course", async (req, res) => {
    //if task is "create_course" create a collection in mongodb"
    //recreate code if already exists
    console.table(req.cookies)
    if (req.body.task === "create_course") {
        let course_code;
        let isUnique = false;
        while (!isUnique) {
            course_code = random.string.create(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ") + random.int(100, 999)
            const x = await db.course.find({ course_code: course_code })
            if (x.length === 0) isUnique = true;
        }
        await db.course.create({ course_code: course_code, course_name: req.body.course_name, faculty_name: req.cookies.name, faculty_email: req.cookies.email, students: [] })
        await db.faculty.update_courses(req.cookies.id, course_code, 'add')
        res.json({ status: "success", message: "Course created successfully!" });
        return;
    }
    if (req.body.task === "finish_course") {
        db.course.delete({ course_code: req.body.course_code });
        db.faculty.update_courses(req.cookies.id, req.body.course_code, 'delete')
        db.class(req.body.course_code).delete()
        res.json({ status: "success", message: "Course deleted successfully!" });
        return;
    }
    if (req.body.task === "join_course") {
        if (db.course.find({ course_code: req.body.course_code })) {
            db.course.update_students(req.body.course_code, req.cookies.email, 'add')
            db.student.update_courses(req.cookies.id, req.body.course_code, 'add')
            res.json({ status: "success", message: "Joined course successfully!" });
            return;
        }
        else {
            res.json({ status: "failure", message: "Course does not exist!" });
            return;
        }
    }
    if (req.body.task === "leave_course") {
        db.course.update_students(req.body.course_code, req.cookies.email, 'delete')
        db.student.update_courses(req.cookies.id, req.body.course_code, 'delete')
        res.json({ status: "success", message: "Left course successfully!" });
        return;
    }
})

app.post("/api/class", async (req, res) => {

    if (req.body.task === "create_class") {
        const id = await db.class(req.body.course_code).create({ start: req.body.start, duration: req.body.duration, venue: req.body.venue })
        if (id) {
            res.json({ status: "success", message: "Class created successfully!" });
        }
        else {
            res.json({ status: "failure", message: "Class creation failed!" });
        }
        return;
    }
    else if (req.body.task === "cancel_class") {
        db.class(req.body.course_code).cancel(req.body.class_id).then(e => {
            res.json({ status: "success", message: "Class cancelled successfully!" })
        }).catch(err => {
            res.json({ status: "failure", message: "Class cancellation failed!" });
            return;
        })
    }
    else if (req.body.task === "note") {
        await db.class(req.body.course_code).notes(req.body.class_id, req.body.notes) ? res.json({ status: "success", message: "Notes updated successfully!" }) : res.json({ status: "failure", message: "Notes update failed!" });
        return;
    }
    else if (req.body.task === "manual_attendance") {
        const details = await db.student.id(req.body.class_id) || await db.student.find({ email: req.body.details.email })
        await db.class(req.body.course_code).attendance(req.body.class_id, { email: details.email, id: details.id }) ? res.json({ status: "success", message: "Attendance marked successfully!" }) : res.json({ status: "failure", message: "Attendance marking failed!" });
        return;
    }
    else if (req.body.task === "update_venue") {
        await db.class(req.body.course_code).location(req.body.class_id, req.body.venue) ? res.json({ status: "success", message: "Venue updated successfully!" }) : res.json({ status: "failure", message: "Venue update failed!" });
        return;
    }
    else if (req.body.task === "absentism") {
        await db.class(req.body.course_code).mark_seat_absent(req.body.class_id, req.body.seat) ? res.json({ status: "success", message: "Seat marked absent successfully!" }) : res.json({ status: "failure", message: "Seat marking absent failed!" });
        return;

    }
})
app.post("/change", async (req, res) => {
    const { email, password, fullName, pfp } = req.body;
    const userId = req.cookies.id;
    const userRole = req.cookies.role; // Assuming role is stored in cookies

    if (!userRole || !db[userRole]) {
        return res.status(400).send("Invalid user role. <a href='/cred_change'>Go back</a>");
    }

    try {
        const existingUser = await db[userRole].find({ email: email });
        if (existingUser.length > 0 && existingUser[0].id.toString() !== userId) {
            return res.status(400).send("Email is already in use by another account. <a href='/cred_change'>Go back</a>");
        }

        let updateData = {};

        if (fullName) {
            updateData.name = fullName;
        }
        if (email) {
            updateData.email = email;
        }
        if (pfp) {
            updateData.Image = pfp;
        }
        if (password) {
            updateData.password = hash(password);
        }

        const updatedUser = await db[userRole].update(userId, updateData);
        res.cookie("name", updatedUser.name, { httpOnly: true });
        res.cookie("email", updatedUser.email, { httpOnly: true });
        res.redirect("/dashboard/" + userRole);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("An error occurred while updating your profile. <a href='/cred_change'>Go back</a>");
    }
});

//Admin_Powers
app.post("/api/classrooms/",async(req,res)=>{
    if (req.cookies.role === 'admin') {
        console.table(req.body)
        if(req.body.task==="add"&&req.body.name&&(await db.room.find(req.body.name) ).length===0){
            db.room.create(req.body.name).then(() => {
                res.json({ status: "success", message: "Classroom creation successfully!" })
            }).catch((err)=>{
                res.json({ status: "failure", message: "Classroom creation failed!" })
            })
        }
        else if(req.body.task==="add"&&req.body.name&&(await db.room.find(req.body.name) ).length>0){
            res.json({ status: "failure", message: "Classroom Creation failed! Classroom exists." })
        }
        else if(req.body.task==="delete"&&req.body.name&&(await db.room.find(req.body.name) ).length>0){
            db.room.delete(req.body.name).then(() => {
                res.json({ status: "success", message: "Classroom deleted successfully!" })
            }).catch((err)=>{
                res.json({ status: "failure", message: "Classroom deletion failed! Error : " + err.message })
            })
        }
        else if(req.body.task==="delete"&&req.body.name&&(await db.room.find(req.body.name) ).length===0){
            res.json({ status: "failure", message: "Classroom deletion failed! Classroom does not exist." })
        }
        else if(req.body.task==="seat"&&req.body.name&&req.body.seat&&req.body.a_or_d&&(await db.room.find(req.body.name) ).length>0){
            db.room.seat(req.body.name,req.body.seat,req.body.a_or_d).then(() => {
                res.json({ status: "success", message: "Classroom seat updated successfully!" })
            }).catch((err)=>{
                res.json({ status: "failure", message: "Classroom seat update failed! Error : " + err.message })
            })
        }
        else if(req.body.task==="seat"&&req.body.name&&req.body.seat&&req.body.a_or_d&&(await db.room.find(req.body.name) ).length===0){
            res.json({ status: "failure", message: "Classroom seat update failed! Classroom does not exist." })
        }
        else{
            res.json({status:"failure",message:"Unknown Error!"})
        }
    } else {
        res.json({ status: "failure", message: "Unauthorized action!" })
    }
})

// Socket.io connection
io.on("connection",  (socket) => {
    console.log("A user connected:", socket.id);
    let steps = [false, false, false]
    let parsedCookies;
    if (socket.request.headers.cookie) {
        parsedCookies = ck.parse(socket.request.headers.cookie);
        console.log('Cookies:', parsedCookies);
        // Access specific cookies, e.g., parsedCookies.myCookieName
    }
    // Handle attendance marking
    if (parsedCookies.role === "student") {
        socket.on("seat", async e=>{
            const seat_data=JSON.parse(e.details);

            const class_data = await db.class(e.course).find(e.id)
            if(class_data.attendance_open && class_data.venue===seat_data.v){

                if(seat_data.s in class_data.seats_occupied ){
                    socket.emit("seatStatus", { status: "failure", message: "Seat already occupied!" });
                }
                else if(seat_data.s in class_data.seats_unoccupied){
                    socket.emit("seatStatus",{ status: "failure", message: "Seat already marked unoccupied!" })
                }
                else{
                    socket.emit("seatStatus", { status: "success", message: "Seat verified!", gesture: random.int(1,7) });
                }

            }
        })
        socket.on("verify",async data=>{
            const saved_face=await db.student.id(parsedCookies.id)
            if(compare_faces(saved_face.Image,data.image)){
            const res = await db.class(data.course_code).attendance(data.id, {id:parsedCookies.id,email:parsedCookies.email});
            
            if (res) {
                socket.emit("verificationStatus", { status: "success", message: "Attendance marked successfully!" });
            } else {
                socket.emit("verificationStatus", { status: "failure", message: "Attendance marking failed!" });        
            }
        }
        else{
                socket.emit("verificationStatus", { status: "failure", message: "Face Recognition failed!" });        

            }
        })
    }
    //Handle Teacher creating attendance session
    if (parsedCookies.role === "faculty") {
        socket.on("createSession", async (data) => {
            try {
                const res2 = await db.class(data.course_code).open(data.id);
                if (res2) {
                    socket.emit("sessionCreated", { status: "success", message: "Attendance session created!", code: res2 });
                } else {
                    socket.emit("sessionCreated", { status: "failure", message: "Attendance session creation failed!" });
                }
            } catch (error) {
                socket.emit("sessionCreated", { status: "failure", message: "Attendance session creation failed due to server error." });
                console.error(error);
            }
        })

        socket.on("ManualMark", async (data) => {
            //similar code here
            try {
                if (data.details.email) {
                    const dat = await db.student.find({ email: data.details.email })
                    data.details.id = dat[0].id
                }
                else if (data.details.id) {
                    data.details.email = (await db.student.id(data.details.id)).email
                }
                else {
                    //throw new Error("Error");

                }
                console.table(data)
                data.details.seat = null;
                const res = await db.class(data.course_code).attendance(data.id, data.details);
            }
            catch (error) {
                console.error(error);
                socket.emit("attendance", { status: "failure", message: "Attendance marking failed!" });

            }
        })
    }
}
);


// Start the server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})