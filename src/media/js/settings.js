define('settings', ['l10n', 'settings_local', 'underscore'], function(l10n, settings_local, _) {
    var gettext = l10n.gettext;

    return _.defaults(settings_local, {
        app_name: 'rocketfuel',
        init_module: 'main',
        default_locale: 'en-US',
        api_url: 'http://' + window.location.hostname,  // No trailing slash, please.

        storage_version: '0',

        param_whitelist: ['carrier', 'region', 'category'],
        api_param_blacklist: ['region'],

        model_prototypes: {
            'collection': 'id',

            'region': 'slug',
            'category': 'slug',
            'carrier': 'slug',

            'app': 'slug'
        },

        fragment_error_template: 'errors/fragment.html',
        pagination_error_template: 'errors/pagination.html',

        tracking_id: 'UA-36116321-6',

        persona_unverified_issuer: 'login.persona.org',

        title_suffix: 'Curation Tool',

        COLLECTION_TYPES: {
            0: gettext('Basic Collection'),
            1: gettext('Featured App Collection'),
            2: gettext('Operator Shelf')
        }
        
    });
});
