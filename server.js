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
    const req=http.request({
        hostname:"localhost",
        port:3000,
        path:"/predict",
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        }
        }
    ,res=>{
        let response;
        res.on("data",(data)=>{
            response=data.toString()
        })
        res.on("end",()=>{
            prediction=response;
        })
    })
    req.write(JSON.stringify({img1:img1,img2:img2}))
    req.end()
    req.on("error",(err)=>{
        console.log(err)
    })
    return prediction; }

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
    const users = await db[userRole].find({ email: email });
    const user = users && users[0];
    if (user && user.password === hash(password)) {
        res.cookie("name", user.name, { httpOnly: true });
        res.cookie("email", user.email, { httpOnly: true });
        res.cookie("role", userRole, { httpOnly: true });
        res.cookie("id", user.id, { httpOnly: true });
        res.redirect("/dashboard/" + userRole);
    } else {
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
        while (1) {
            course_code = random.string.create(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ") + random.int(100, 999)
            value = false
            const x = await db.course.find({ course_code: course_code })
            if (x.length == 0) value = true;
            if (value) break;
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
        const id = await db.class(req.body.course_code).create({ start: req.body.start, duration: req.body.duration })
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
})

// Socket.io connection
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    let steps = [false, false, false]
    let parsedCookies;
    if (socket.request.headers.cookie) {
        parsedCookies = ck.parse(socket.request.headers.cookie);
        console.log('Cookies:', parsedCookies);
        // Access specific cookies, e.g., parsedCookies.myCookieName
    }
    // Handle attendance marking
    if (parsedCookies.role == "student") {
        socket.on("details",async data=>{
            socket.emit("time",(await db.class(data.course_code).find(data.id))[0].attendance_date)
        })
        socket.on("loc", async (data) => {
            let data_tr = await db.class(data.course_code).find(data.id)
            data_tr = data_tr.location
            if ((data_tr[0] - data.location[0]) ** 2 + (data_tr[1] - data.location[1] ** 2) < 0.0009 ** 2) {
                socket.emit("locStatus", { status: "success", message: "Location verified" });
                steps[0] = true
            } else {
                socket.emit("locStatus", { status: "failure", message: "Location mismatch" });
            }
        });
        socket.on("code", async (code) => {
            const res = await db.class(code.course_code).find(code.id);

            if (steps[0] && res.code == code.code) {
                socket.emit("codeStatus", { status: "success", message: "Code verified",gesture:random.array.sample(["thumb_up", "thumb_down", "victory", "point_up", "open_palm", "closed_fist"],1)[0] });
                steps[1] = true
            } else {
                socket.emit("codeStatus", { status: "failure", message: "Incorrect code" });
            }
        })
        socket.on("face", async (data) => {
            const details = await db.student.find({ email: parsedCookies.email })
            console.table(details);
            const face_verified = compare_faces(data.imgUrl, details[0].Image)
            if (steps[0] && steps[1] && face_verified) {
                await db.class(data.course_code).attendance(data.id, details)
                steps[2] = true
            }

            if (steps[0] && steps[1] && steps[2]) {
                socket.emit("marked", { status: "success", message: "Attendance marked successfully!" });
            } else {
                socket.emit("marked", { status: "failure", message: "Attendance marking failed. Please try again." });
            }
        })
    }
    //Handle Teacher creating attendance session
    if (parsedCookies.role == "faculty") {
        socket.on("createSession", async (data) => {
            try {
                const res1 = await db.class(data.course_code).location(data.id, data.location);
                const res2 = await db.class(data.course_code).code(data.id);
                if (res1 && res2) {
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
                const res = await db.class(data.course_code).attendance(data.id, data.details);
                if (res) {
                    socket.emit("attendance", { status: "success", message: "Attendance marked successfully!" });
                } else {
                    socket.emit("attendance", { status: "failure", message: "Attendance marking failed!" });

                }
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
});