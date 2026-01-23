function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Check if the URI ends with '/'
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    }
    // Check if the URI has no file extension (e.g., /services instead of /services/)
    else if (!uri.includes('.')) {
        request.uri += '/index.html';
    }

    return request;
}
