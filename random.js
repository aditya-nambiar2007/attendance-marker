const random = {
    string: {
        create: (len, a) => {
            let str = ""
            const letter = a || "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890!@$#%^&*(){}[];:'\|?/><.,+=-_*"
            for (let i = 0; i < len; i++) { str += letter.charAt(Math.floor(Math.random() * letter.length)) }
            return str
        },
        jumble: (str) => { return Array.from(str).sort(() => 0.5 - Math.random()).join('') }
    },
    int: function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a },
    float:function (a, b) { return (Math.random() * (b - a + 1)) + a },
    array: {
        sort: (array) => { return array.slice().sort(() => 0.5 - Math.random()) },
        sample: (arr, n=1) => { return random.array.sort(arr).slice(0, n) }
    },
    object_sample:(obj,n=1)=>{
        let x=Object.keys(obj).sort(() => 0.5 - Math.random()).splice(0,n)
        let ret={}
        x.forEach(e=>ret[e]=obj[e])
        return ret
    },
    bool : ()=>{return 0.5>Math.random()}

}

try {module.exports = random} catch (e) {}