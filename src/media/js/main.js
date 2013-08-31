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

(function() {

    define(
        'main',
        [
            'underscore',
            'helpers',  // Must come before mostly everything else.
            'capabilities',
            'defer',
            'forms',
            'l10n',
            'log',
            'login',
            'models',
            'navigation',
            'requests',
            'templates',
            //'tracking',
            'urls',
            'user',
            'views',
            'z'
        ],
    function(_) {
        var log = require('log');
        var console = log('main');
        console.log('Dependencies resolved, starting init');

        var capabilities = require('capabilities');
        var models = require('models');
        var nunjucks = require('templates');
        var filters = nunjucks.require('filters');
        var helpers = nunjucks.require('globals');
        var urls = require('urls');
        var z = require('z');

        nunjucks.env.dev = true;

        z.body.addClass('html-' + require('l10n').getDirection());

        z.page.one('loaded', function() {
            console.log('Hiding splash screen');
            var splash = $('#splash-overlay').addClass('hide');
            setTimeout(function() {splash.remove();}, 1000);
        });

        // This lets you refresh within the app by holding down command + R.
        if (capabilities.chromeless) {
            window.addEventListener('keydown', function(e) {
                if (e.keyCode == 82 && e.metaKey) {
                    window.location.reload();
                }
            });
        }

        // Add some helpful functions.
        helpers.COLOR_PATTERN = '#[0-9a-fA-F]{6}';
        helpers.color_cycle = function() {
            var cache = {};
            var n = 0;
            return function(value) {
                console.warn(value, n);
                if (value in cache) return cache[value];
                var h = (Math.pow(n, 2) * 25 + 40) % 349 | 0;
                var l = (n * 49 + 20) % 31 + 60 | 0;
                n++
                return cache[value] = 'hsla(' + h + ', 50%, ' + l + '%, 0.7)';
            };
        }
        helpers.model_lookup = function(model, key, by) {
            return models(model).lookup(key, by);
        };
        filters.translate = function(data, default_language, lang) {
            if (typeof data === 'string') {
                return data;
            }
            // TODO: Make this a setting somewhere.
            default_language = default_language || 'en-US';
            lang = lang || helpers.language;
            if (lang in data) {
                return data[lang];
            }
            var short_lang = lang.split('-')[0];
            if (short_lang in data) {
                return data[short_lang];
            }
            if (typeof default_language === 'string') {
                return data[default_language];
            } else if (typeof default_language === 'object' &&
                       'default_language' in default_language) {
                return data[default_language.default_language];
            }
            for (var x in data) { return data[x]; }
            return '';
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
                nunjucks.env.getTemplate('header.html').render(context));
            $('#site-footer').html(
                nunjucks.env.getTemplate('footer.html').render(context));

            z.body.toggleClass('logged-in', require('user').logged_in());
            z.page.trigger('reloaded_chrome');
        }).trigger('reload_chrome');

        z.body.on('click', '.site-header .back', function(e) {
            e.preventDefault();
            console.log('← button pressed');
            require('navigation').back();
        });

        function do_model_cache(model, url) {
            return require('requests').get(url).done(function(data) {
                var cache = models(model);
                data.objects.forEach(function(obj) {
                    cache.cast(obj);
                });
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
            z.doc.on('touchstart mousedown', '.wordmark', function(e) {
                console.log('hold for debug...', e.type);
                clearTimeout(to);
                to = setTimeout(function() {
                    console.log('navigating to debug...');
                    z.page.trigger('navigate', ['/debug']);
                }, 3000);
            }).on('touchend mouseup', '.wordmark', function(e) {
                console.log('debug hold released...', e.type);
                clearTimeout(to);
            });
        })();

        console.log('Initialization complete');
    });

})();
