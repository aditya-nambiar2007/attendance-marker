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
    start: { type: String, required: true },
    end: { type: String, required: true },
    attendance: Map,
    location: [Number],
    code: String,
    status: { type: String, required: true, default: "pending", enum: ["pending", "completed", "cancelled"] },
    Notes: String
})


const Student = mongoose.model('Student', studentSchema)
const Faculty = mongoose.model('Faculty', facultySchema)
const Course = mongoose.model('Course', courseSchema)
const OTP = mongoose.model('OTP', OTPSchema)



const exports = {
    student: {
        create: async (data) => {
            data.courses = []
            const student = new Student(data)
            return await student.save()
        },
        find: async (query) => {
            return await Student.find(query)
        },
        id: async id => {
            return await Student.findById(id)
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
    }
    ,
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
            data.students = []
            const course = new Course(data)
            return await course.save()
        },
        find: async (query) => {
            return query.id?await Course.findById(query.id):await Course.find({course_code:query.code})
        
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
        const Class = mongoose.model(course_code, classSchema)
        return {
            create: async data => { const sav = new Class(data); sav.save(); return sav.id },
            location: async (id, location) => { return await Class.findByIdAndUpdate(id, { location: location }) },
            code: async (id) => {
                await Class.findByIdAndUpdate(id, { code: code });
                setTimeout(async () => { await Class.findByIdAndUpdate(id, { code: "" }) }, 20 * 1000)
            },
            ret_all: async () => { return await Class.find() },
            find: async id => { return await Class.findById(id) },
            attendance: async (id, details) => {
                if (!exports.course.find({ course_code: course_code })) {
                    return { msg: "Course does not exist" }
                }
                return await Class.findByIdAndUpdate(id, { $addToSet: { attendance: details.email } })
            },
            cancel: async id => {
                return await Class.findByIdAndUpdate(id, { status: "cancelled" })
            },
            delete: async () => {
                mongoose.connection.db.dropCollection(course_code).then(e=>{}).catch(e=>{console.log("This Collection doesn't exist")})
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