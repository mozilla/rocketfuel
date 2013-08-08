define('routes_api', [], function() {
    return {
        'collections': '/api/v1/rocketfuel/collections/',
        'collection': '/api/v1/rocketfuel/collections/{0}/',
        'add_app': '/api/v1/rocketfuel/collections/{0}/add_app',
        'login': '/api/v1/account/login/'
    };
});
