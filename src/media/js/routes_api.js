define('routes_api', [], function() {
    return {
        'collections': '/api/v1/rocketfuel/collections/',
        'collection': '/api/v1/rocketfuel/collections/{0}/',
        'add_app': '/api/v1/rocketfuel/collections/{0}/add_app',

        'categories': '/api/v1/apps/category/',
        'carriers': '/api/v1/services/carrier/',
        'regions': '/api/v1/services/region/',
        'login': '/api/v1/account/login/'
    };
});
