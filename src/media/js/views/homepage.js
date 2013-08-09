define('views/homepage',
    ['format', 'l10n', 'settings', 'utils', 'z'],
    function(format, l10n, settings, utils, z) {

    var gettext = l10n.gettext;

    z.page.on('change', '.home_filters select', function(e) {
        var cat = $('#filter_category').val();
        var region = $('#filter_region').val();
        var carrier = $('#filter_carrier').val();

        var base_url = settings.api_url;
        if (cat) {
            base_url += '/category/' + cat;
        }

        var args = {'region': region};
        if (carrier) {
            args.carrier = carrier;
        }
        base_url = utils.urlparams(base_url, args);
        $('#filter_preview').attr('src', base_url);
    });

    return function(builder) {
        builder.start('homepage.html');

        builder.z('type', 'root');
        builder.z('title', gettext('Publishing Tool'));
    };
});
