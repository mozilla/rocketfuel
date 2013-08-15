define('views/homepage',
    ['format', 'l10n', 'settings', 'underscore', 'utils', 'z'],
    function(format, l10n, settings, _, utils, z) {

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
                'region': args.region,
                'category': args.category,
                'carrier': args.carrier
            }
        );

        builder.z('type', 'root');
        builder.z('title', gettext('Overview'));
    };
});
