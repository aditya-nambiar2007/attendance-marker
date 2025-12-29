const getCookie = (name) => {
    const xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/cookie?param=" + encodeURIComponent(name), false); // false -> synchronous
    try {
        xhttp.send();
        if (xhttp.status === 200) {
            return xhttp.responseText || null;
        } else {
            return null;
        }
    } catch (err) {
        console.error("getCookie error:", err);
        return null;
    }
};

function customPrompt(message) {
    return new Promise((resolve, reject) => {
        $('#promptInput').attr("placeholder", message);
        $('#promptInput').val(''); // Clear previous input
        $('#customPrompt').show();

        $('#promptOk').off('click').on('click', function () {
            const inputValue = $('#promptInput').val();
            $('#customPrompt').hide();
            resolve(inputValue);
        });

        $('#promptCancel').off('click').on('click', function () {
            $('#customPrompt').hide();
            reject(); // Or resolve with null, depending on desired behavior
        });
    });
}
function customPromptAll(...params) {
    return new Promise((resolve, reject) => {
        // normalize params: allow customPromptAll([{type,msg},{...}]) or customPromptAll([['text','Name'],...]) or customPromptAll('Name', ...)
        if (params.length === 1 && Array.isArray(params[0])) params = params[0];

        const $container = $('#customPrompt .prompt-content');
        $container.empty();

        // Build inputs based on params. Track names to return values in order.
        const names = [];
        params.forEach((p, idx) => {
            let type = 'text', message = `Input ${idx + 1}`, name = `prompt_${idx}`, options = [];
            if (typeof p === 'string') {
                message = p;
            } else if (Array.isArray(p)) {
                type = p[0] || 'text';
                message = p[1] || message;
                options = p[2] || []
            } else if (typeof p === 'object' && p !== null) {
                type = p.type || 'text';
                message = p.message || message;
                name = p.name || name;
            }
            names.push(name);

            const $label = $('<label>').text(message + ':').css({ display: 'block', 'margin-bottom': '6px', 'font-weight': '500' });
            if (type === 'select') {
                const $input = $('<select>')
                    .addClass('promptInput')
                    .attr({ name })
                    .css({ width: '100%', padding: '8px', 'margin-bottom': '12px', 'box-sizing': 'border-box' });
                $input.append($('<option>').attr('value', '').text('--Select--'))
                for (const option of options) {
                    const $option = $('<option>').attr('value', option).text(option);
                    $input.append($option);
                }
                const $p = $('<p>').attr('class', 'promptMessage').append($label, $input)
                $container.append($p);
            }
            else if (type === 'txtarea') {
                const $input = $('<textarea>')
                    .addClass('promptInput')
                    .attr({ placeholder: message, name })
                    .css({ width: '100%', padding: '8px', 'margin-bottom': '12px', 'box-sizing': 'border-box' });
                const $p = $('<p>').attr('class', 'promptMessage').append($label, $input)
                $container.append($p);
            }
            else { // Default to a standard input
                const $input = $('<input>')
                    .addClass('promptInput')
                    .attr({ type, placeholder: message, name })
                    .css({ width: '100%', padding: '8px', 'margin-bottom': '12px', 'box-sizing': 'border-box' });
                const $p = $('<p>').attr('class', 'promptMessage').append($label, $input)
                $container.append($p);

            }
        });

        // show prompt and clear previous values
        $('#customPrompt').show();
        $('.promptInput').first().focus();

        // Ok handler
        $('#promptOk').off('click.customPromptAll').on('click.customPromptAll', function () {
            const values = [];
            $('.promptInput').each(function () {
                if (!$(this).val()) { reject(); alert("Please fill all the fields."); return; }
                values.push($(this).val());
            });
            $('#customPrompt').hide();
            resolve(values);
        });

        // Cancel handler
        $('#promptCancel').off('click.customPromptAll').on('click.customPromptAll', function () {
            $('#customPrompt').hide();
            reject(); // caller can catch or treat as cancelled
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
async function getPromptAll(...param) {
    try {
        const userName = await customPromptAll(param);
        return userName;
    } catch (error) {
        return null;
    }
}

function get_query(params) {
    const URI = new URL(window.location.href)
    return URI.searchParams.get(params)
}

const printDiv = (divId) => {
    const printContents = document.querySelector(divId).innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
};