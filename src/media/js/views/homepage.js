define('views/homepage',
    ['format', 'l10n', 'models', 'settings', 'underscore', 'utils', 'z'],
    function(format, l10n, models, settings, _, utils, z) {

    var gettext = l10n.gettext;

    z.page.on('change', '.home_filters select', function(e) {
        var carrier_val = $('#filter_carrier').val() || undefined;
        var filters = {
            'category': $('#filter_category').val() || undefined,
            'region': $('#filter_region').val() || undefined,
            'carrier': carrier_val === 'carrierless' ? '' : carrier_val
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
                'region': args.region || 'worldwide',
                'category': args.category || '',
                'carrier': args.carrier || ''
            }
        );

        builder.z('type', 'root');
        builder.z('title', gettext('Overview'));

        // Load the preview.
        builder.done(function() {
            var url = settings.api_url;
            if (args.category) {
                url += '/category/' + args.category;
            }

            url = utils.urlparams(url, {
                'region': args.region || 'worldwide',
                'carrier': args.carrier || undefined,
                'lang': navigator.l10n ? navigator.l10n.language : 'en-US',
                'preview': 'true'
            });

            $('iframe#filter_preview').attr('src', url);
        });
    };
});
