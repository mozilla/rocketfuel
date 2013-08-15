define('views/homepage',
    ['format', 'l10n', 'models', 'settings', 'underscore', 'utils', 'z'],
    function(format, l10n, models, settings, _, utils, z) {

    var gettext = l10n.gettext;

    z.page.on('change', '.home_filters select', function(e) {
        var filters = {
            'category': $('#filter_category').val() || undefined,
            'region': $('#filter_region').val() || undefined,
            'carrier': $('#filter_carrier').val() || undefined
        };
        z.page.trigger('divert', [utils.urlparams('', filters)]);
    });

    return function(builder) {

        function get_url_params(url, type) {
            var filters = utils.getVars();
            filters.type = type;
            return utils.urlparams(url, filters);
        }

        var args = utils.getVars();
        builder.start(
            'homepage.html',
            {
                'get_url_params': get_url_params,
                'region': parseInt(args.region, 10) || null,
                'category': parseInt(args.category, 10) || null,
                'carrier': parseInt(args.carrier, 10) || null
            }
        );

        builder.z('type', 'root');
        builder.z('title', gettext('Overview'));

        // Load the preview.
        builder.done(function() {
            var url = settings.api_url;
            if (args.category) {
                url += '/category/' + models('category').lookup(args.category).slug;
            }

            url = utils.urlparams(url, {
                'region': args.region ? models('region').lookup(args.region).slug : undefined,
                'carrier': args.carrier ? models('carrier').lookup(args.carrier).slug : undefined,
                'lang': navigator.l10n ? navigator.l10n.language : 'en-US'
            });

            $('iframe#filter_preview').attr('src', url);
        });
    };
});
