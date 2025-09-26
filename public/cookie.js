const getCookie = (name) => {
    if (!document.cookie) {return "";}
    let params=document.cookie.split("; ")
    let ans={}
    params.forEach(e=> {
    let keyValue=e.split("=");
        ans[keyValue[0]]=decodeURIComponent(keyValue[1]);
        });
    return name?ans[name]:ans;
};

function customPrompt(message) {
    return new Promise((resolve, reject) => {
        $('#promptInput').attr("placeholder",message);
        $('#promptInput').val(''); // Clear previous input
        $('#customPrompt').show();

        $('#promptOk').off('click').on('click', function() {
            const inputValue = $('#promptInput').val();
            $('#customPrompt').hide();
            resolve(inputValue);
        });

        $('#promptCancel').off('click').on('click', function() {
            $('#customPrompt').hide();
            reject(); // Or resolve with null, depending on desired behavior
        });
    });
}

async function getPrompt(param) {
          try {
            const userName = await customPrompt(param);
            return userName;
          } catch (error) {
            return null;
          }
        }