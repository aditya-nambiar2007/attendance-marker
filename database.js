import mongoose from "mongoose"


mongoose.connect('mongodb://localhost:27017/attendance-system')
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log("Error connecting to MongoDB:", err))

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    Image: { type: String, required: true },
    courses: [String]
})

const OTPSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
})

const facultySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    Image: { type: String, required: false },
    courses: [String]
})

const courseSchema = new mongoose.Schema({
    course_code: { type: String, required: true },
    course_name: { type: String, required: true },
    faculty_name: { type: String, required: true },
    faculty_email: { type: String, required: true },
    students: [String],
})

const classSchema = new mongoose.Schema({
    course_code: { type: String, required: true },
    start: { type: Date, required: true },
    duration: { type: Number, required: true },
    attendance: [Map],
    seats_occupied: [String],
    seats_unoccupied: [String],
    attendance_date: { type: Date },
    venue: String,
    attendance_open: {type:Boolean,default:false},
    status: { type: String, required: true, default: "pending", enum: ["pending", "completed", "cancelled"] },
    Notes: String
})

const roomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    seats: [String],
})

const Room = mongoose.model('Room', roomSchema)
const Student = mongoose.model('Student', studentSchema)
const Faculty = mongoose.model('Faculty', facultySchema)
const Course = mongoose.model('Course', courseSchema)
const Class = mongoose.model("Class", classSchema)
const OTP = mongoose.model('OTP', OTPSchema)



const exports = {
    room: {
        create: async (input) => {
            // Accept either a string name or an object with fields for room
            if (typeof input === 'string') {
                const room = new Room({ name: input });
                return await room.save();
            }
            else if (input && typeof input === 'object') {
                const room = new Room(input);
                return await room.save();
            }
            throw new Error('Invalid input for room.create');
        },
        update: async (nameOrQuery, data) => {
            // nameOrQuery can be a string (room name) or a query object
            if (typeof nameOrQuery === 'string') {
                return await Room.findOneAndUpdate({ name: nameOrQuery }, data, { new: true });
            }
            return await Room.findOneAndUpdate(nameOrQuery, data, { new: true });
        },
        seat: async (name, seat, a_or_d) => {
            if(a_or_d=='add'){
                return await Room.findOneAndUpdate({ name: name }, { $addToSet: { seats: seat } }, { new: true });
            }
            else if(a_or_d=='delete'){
                return await Room.findOneAndUpdate({ name: name }, { $pull: { seats: seat } }, { new: true });
            }
        },
        delete: async (nameOrQuery) => {
            // Accept either a string name or a query object
            if (typeof nameOrQuery === 'string') {
                return await Room.deleteOne({ name: nameOrQuery });
            }
            return await Room.deleteOne(nameOrQuery);
        },
        find: async (nameOrQuery) => {
            // Accept either a string (name) or a query object
            if (typeof nameOrQuery === 'string') {
                return await Room.find({ name: nameOrQuery });
            }
            if (!nameOrQuery) {
                return await Room.find({});
            }
            return await Room.find(nameOrQuery);
        },
    },

    student: {
        create: async (data) => {
            const student = new Student(data)
            data.courses = []
            return await student.save()
        },
        find: async (query) => {
            return await Student.find(query)
        },
        id: async id => {
            return await Student.findById(id)
        },
        update: async (id, data) => {
            return await Student.findByIdAndUpdate(id, data, { new: true });
        },
        update_img: async (id, img) => {
            return await Student.findByIdAndUpdate(id, { Image: img })
        },
        update_courses: async (id, course, a_or_d) => {
            const data = await Student.findById(id)
            if (a_or_d == 'add') {
                data.courses.addToSet(course)
            }
            else if (a_or_d == 'delete') {
                data.courses.pull(course)
            }
            data.save()
        },
        delete: async (query) => {
            return await Student.deleteOne(query)
        },
    },

    faculty: {
        create: async (data) => {
            data.courses = []
            const faculty = new Faculty(data)
            return await faculty.save()
        },
        find: async (query) => {
            return await Faculty.find(query)
        },
        id: async id => {
            return await Faculty.findById(id)
        },
        update: async (id, data) => {
            return await Faculty.findByIdAndUpdate(id, data, { new: true });
        },
        update_courses: async (id, course, a_or_d) => {
            const data = await Faculty.findById(id)
            if (a_or_d == 'add') {
                data.courses.addToSet(course)
                data.save()
            }
            else if (a_or_d == 'delete') {
                data.courses.pull(course)
                data.save()
            }
        },
        delete: async (query) => {
            return await Faculty.deleteOne({ id: query })
        },
    },

    course: {
        create: async (data) => {
            const courseData = { ...data, students: [] };
            const course = new Course(courseData);
            return await course.save();
        },
        find: async (query) => {
            return query.id ? await Course.findById(query.id) : await Course.find({ course_code: query.code })

        },
        update_students: async (id, student, a_or_d) => {
            const data = await Course.findOne({ course_code: id })
            if (a_or_d == 'add') {
                data.students.addToSet(student)
                data.save()
            }
            else if (a_or_d == 'delete') {
                data.students.pull(student)
                data.save()
            }
        },
        delete: async (query) => {
            return await Course.deleteOne(query)
        },
    },

    class: (course_code) => {
        if (!exports.course.find({ course_code: course_code })) {
            return { msg: "Course does not exist" }
        }
        return {
            create: async data => { data.course_code = course_code; const sav = new Class(data); sav.save(); return sav.id },
            location: async (id, location) => { return await Class.findByIdAndUpdate(id, { venue: location }) },
            open: async (id) => {
                await Class.findByIdAndUpdate(id, { attendance_open: true });
                setTimeout(async () => { await Class.findByIdAndUpdate(id, { attendance_open: false }) }, 30 * 1000)
                return true;    
            },
            ret_all: async () => { return await Class.find({ course_code: course_code }) },
            find: async id => { return await Class.findById(id) },
            attendance: async (id, details) => {
                const data = new Map([["email", details.email], ["id", details.id], ["seat", details.seat]]);
                if (details.seat) {
                    await Class.findByIdAndUpdate(id, { $addToSet: { seats_occupied: details.seat } })
                }
                return await Class.findByIdAndUpdate(id, { $addToSet: { attendance: data } })
            },
            mark_seat_absent: async (id, seat) => {
                await Class.findByIdAndUpdate(id, { $pull: { attendance: ["seat", seat] } })
                await Class.findByIdAndUpdate(id, { $pull: { seats_occupied: seat } })
                return await Class.findByIdAndUpdate(id, { $addToSet: { seats_unoccupied: seat } })
            },
            mark_seat_occupied: async (id, seat) => {
                // Add seat to occupied and remove from unoccupied
                await Class.findByIdAndUpdate(id, { $addToSet: { seats_occupied: seat } });
                await Class.findByIdAndUpdate(id, { $pull: { seats_unoccupied: seat } });
                return await Class.findByIdAndUpdate(id, { $addToSet: { seats_occupied: seat } });
            },
            notes: async (id, notes) => {
                return await Class.findByIdAndUpdate(id, { Notes: notes })
            },
            cancel: async id => {
                console.log(await Class.findById(id), " is being cancelled")
                return await Class.findByIdAndUpdate(id, { status: "cancelled" })
            },
            date: async (id, date) => {
                if (date) {
                    await Class.findByIdAndUpdate(id, { attendance_date: date })
                    return;
                }
                else {
                    return await Class.findById(id).attendance_date
                }
            },
            delete: async () => {
                return await Class.deleteMany({ course_code: course_code })
            },
            query: async (query) => {
                return await Class.find(query)
            }

        }
    },

    otp: {
        create: async (email, otp) => {
            await OTP.deleteOne({ email: email })
            new OTP({ email: email, otp: otp }).save()
            setInterval(async () => {
                await OTP.deleteOne({ email: email })
            }, 60 * 10 * 1000)
        },
        check: async (email, otp) => {
            const data = await OTP.find({ email: email })
            const res = data[0].otp === otp
            await OTP.deleteOne({ email: email })
            return res
        }
    }
}
export default exports