console.log('Rocketfuel');

require.config({
    enforceDefine: true,
    paths: {
        'jquery': 'lib/jquery-2.0.2',
        'underscore': 'lib/underscore',
        'nunjucks': 'lib/nunjucks',
        'nunjucks.compat': 'lib/nunjucks.compat',
        'templates': '../../templates',
        'settings': ['settings_local', 'settings'],
        'format': 'lib/format'
    }
});

define(
    'main',
    [
        'helpers',  // Must come before mostly everything else.
        'defer',
        'forms',
        'l10n',
        'log',
        'login',
        'models',
        'navigation',
        'requests',
        'templates',
        'urls',
        'user',
        'z'
    ],
function() {
    var log = require('log');
    var console = log('main');
    console.log('Dependencies resolved, starting init');

    var models = require('models');
    var nunjucks = require('templates');
    var filters = nunjucks.require('filters');
    var helpers = nunjucks.require('globals');
    var urls = require('urls');
    var z = require('z');

    nunjucks.env.dev = true;

    z.body.addClass('html-' + require('l10n').getDirection());

    // Add some helpful functions.
    helpers.COLOR_PATTERN = '#[0-9a-fA-F]{6}';
    helpers.color_cycle = function(alpha) {
        alpha = alpha || 1;
        var cache = {};
        var n = 0;
        return function(value) {
            if (value in cache) return cache[value];
            var h = (Math.pow(n, 2) * 50 + 40) % 349 | 0;
            var l = (n * 49 + 20) % 31 + 40 | 0;
            n++;
            return cache[value] = 'hsla(' + h + ', 50%, ' + l + '%, ' + alpha + ')';
        };
    }
    helpers.model_lookup = function(model, key, by) {
        return models(model).lookup(key, by);
    };
    var regex_chars = '\\()[]{}-.*?!+^$|=';
    // TODO: Consider adding this to commonplace helpers.
    filters.make_regex_safe = function(data) {
        if (typeof data !== 'string') {
            return data;
        }
        for (var i = 0; i < regex_chars.length; i++) {
            data = data.replace(
                new RegExp('\\' + regex_chars[i], 'g'), '\\' + regex_chars[i]);
        }
        return data;
    };

    // Do some last minute template compilation.
    z.page.on('reload_chrome', function() {
        console.log('Reloading chrome');
        var context = {z: z};
        $('#site-header').html(
            nunjucks.env.render('header.html', context));
        $('#site-footer').html(
            nunjucks.env.render('footer.html', context));

        z.body.toggleClass('logged-in', require('user').logged_in());
        z.body.toggleClass('is-curator', require('user').get_permission('curator'));
        z.body.toggleClass('is-not-curator', !require('user').get_permission('curator'));
        z.page.trigger('reloaded_chrome');
    }).trigger('reload_chrome');

    function do_model_cache(model, url) {
        return require('requests').get(url).done(function(data) {
            var cache = models(model);
            console.groupCollapsed('Casting ' + model + 's to model cache...');
            data.objects.forEach(function(obj) {
                cache.cast(obj);
            });
            console.groupEnd();
        });
    }

    console.log('Starting cache pre-filling...');
    require('defer').when(
        do_model_cache('carrier', urls.api.url('carriers')),
        do_model_cache('category', urls.api.url('categories')),
        do_model_cache('region', urls.api.url('regions'))
    ).done(function() {
        // Perform initial navigation.
        console.log('Triggering initial navigation');
        z.page.trigger('navigate', [window.location.pathname + window.location.search]);
    });

    // Debug page
    (function() {
        var to = false;
        z.body.on('touchstart mousedown', '.wordmark', function(e) {
            console.log('hold for debug...', e.type);
            clearTimeout(to);
            to = setTimeout(function() {
                console.log('navigating to debug...');
                z.page.trigger('navigate', ['/debug']);
            }, 3000);
        }).on('touchend mouseup', '.wordmark', function(e) {
            console.log('debug hold released...', e.type);
            if (to) {
                e.preventDefault();
                e.stopPropagation();
            }
            clearTimeout(to);
            to = -1; // An impossible timeout, but still truthy.
        }).on('click', '#site-header h1 a', function(e) {
            if (to) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
    })();

    console.log('Initialization complete');
});
