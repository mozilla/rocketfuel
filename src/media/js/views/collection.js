define('views/collection', ['l10n'], function(l10n) {

    var gettext = l10n.gettext;

    return function(builder, params) {
        builder.start(
        	'collection.html',
        	{id: params[0]}
        );

        builder.z('type', 'leaf');
        builder.z('title', gettext('Collection')); 
    };
});
