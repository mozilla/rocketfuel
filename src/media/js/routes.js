(function() {

// Please leave quotes around keys! They're needed for Space Heater.
var routes = window.routes = [
    {'pattern': '^/$', 'view_name': 'homepage'},
    {'pattern': '^/publishing/?$', 'view_name': 'homepage'},
    {'pattern': '^/publishing/collection/([^/<>"\']+)$', 'view_name': 'collection'},
    {'pattern': '^/publishing/new_collection$', 'view_name': 'new_collection'},

    {'pattern': '^/tests$', 'view_name': 'tests'},
    {'pattern': '^/debug$', 'view_name': 'debug'}
];

define(
    'routes',
    routes.map(function(i) {
        if (!i.dummy) {
            return 'views/' + i.view_name;
        }
    }),
    function() {
        for (var i = 0; i < routes.length; i++) {
            var route = routes[i];
            var view = require('views/' + route.view_name);
            route.view = view;
        }
        return routes;
    }
);

})();
