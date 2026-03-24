// Link (newtab or no newtab)

function openLink(href, newtab) {
    if (newtab === true) {
        const tab = window.open(href, '_blank');
        if (tab) {
            tab.focus();
        }
    }

    if (newtab === false) {
        const tab = window.open(href, '_self');
    }
}