async function handleRequestAndProcess(args) {
    const {
        type = 'ipv4', // eg: "ipv4" "ipv6" "asn"
        country = null, // eg: "CN"
        format = 'text', // eg: "json" "text" "html"
    } = args

    const apnicRes = await fetch("http://ftp.apnic.net/apnic/stats/apnic/delegated-apnic-latest");

    const apnicText = await apnicRes.text()

    const allData = apnicText.split('\n').filter(v => v[0] !== '#').map(v => v.split('|'))

    let retData = []
    if (type == 'asn')
        retData = allData.filter(v => (country === null || v[1] === country) && v[1] !== '*' && v[2] === 'asn').map(v => v[3])
    else if (type == 'ipv4')
        retData = allData.filter(v => (country === null || v[1] === country) && v[1] !== '*' && v[2] === 'ipv4').map(v => `${v[3]}/${32 - Math.log(v[4]) / Math.log(2)}`)
    else if (type == 'ipv6')
        retData = allData.filter(v => (country === null || v[1] === country) && v[1] !== '*' && v[2] === 'ipv6').map(v => `${v[3]}/${128 - Math.log(v[4]) / Math.log(2)}`)

    if (format === 'json')
        return { ret: JSON.stringify(retData), contentType: "application/json" }
    else if (format === 'text')
        return { ret: retData.join('\n'), contentType: "text/plain" }
    else if (format === 'html')
        return {
            ret: `<table border="1">` +
                `<thead><tr><th>key</th><th>label</th><th>locale</th></tr></thead>` +
                `<tbody>${retData.map(e => `<tr><td>${e}</td></tr>`).join('')}</tbody>` +
                `</table>`,
            contentType: "text/html; charset=UTF-8"
        }
    else
        return { ret: "Error", contentType: "text/plain" }
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
}

function handleOptions(request) {
    let headers = request.headers
    if (
        headers.get('Origin') !== null &&
        headers.get('Access-Control-Request-Method') !== null &&
        headers.get('Access-Control-Request-Headers') !== null
    ) {
        let respHeaders = {
            ...corsHeaders,
            'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers'),
        }

        return new Response(null, {
            headers: respHeaders,
        })
    } else {
        return new Response(null, {
            headers: {
                Allow: 'GET, HEAD, POST, OPTIONS',
            },
        })
    }
}

async function handleRequest(request) {
    const { url, method, headers } = request
    const { pathname, searchParams } = new URL(url)

    if (pathname == '/ping') {
        return new Response("pong", { headers: { ...corsHeaders, "content-type": "text/plain" } })
    }

    if (pathname == '/help') {
        return new Response(
            "<h1>TODO</h1",
            { headers: { ...corsHeaders, "content-type": "text/html" } }
        )
    }

    const args = method == 'GET'
        ? {
            type: searchParams.has('type') ? searchParams.get('type') : undefined,
            country: searchParams.has('country') ? searchParams.get('country') : undefined,
            format: searchParams.has('format') ? searchParams.get('format') : undefined,
        }
        : method == 'POST'
            ? await request.json()
            : {}

    const { ret, contentType } = await handleRequestAndProcess(args)
    return new Response(ret, { headers: { ...corsHeaders, "content-type": contentType } })

}

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS')
            return handleOptions(request)
        else
            return handleRequest(request)
    }
}
