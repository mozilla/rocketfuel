LOCALES=(bg ca cs de en_US es eu fr ga_IE hr hu it ja nl pl pt_BR ru sk zh_TW dbg)
POT_FILE="locale/templates/LC_MESSAGES/messages.pot"
INIT_FLAGS="--input=$POT_FILE --width=200 --no-translator"
LANGPACK_DIR="src/media/locales"

if [ ! -f $POT_FILE ]; then
    echo "Please run from root rocketfuel directory."
    exit 2
fi

function confirm {
    PROMPT=$1
    read -p "$PROMPT [Y/n]: " YESNO
    if [[ $YESNO == "n" ]]
    then
        return 1
    else
        return 0
    fi
}

if confirm "Extract new strings?"; then
    commonplace extract_strings
fi

if confirm "Add new locales?"; then
    for LOCALE in ${LOCALES[@]}; do
        if [ ! -d "locale/$LOCALE" ]; then
            LOCALE_DIR="locale/$LOCALE/LC_MESSAGES"
            mkdir -p $LOCALE_DIR
            msginit $INIT_FLAGS --locale=$LOCALE --output-file=$LOCALE_DIR/messages.po
            git add $LOCALE_DIR
        fi
    done
fi
