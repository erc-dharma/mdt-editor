'use strict';

window.Transliterate = (function() {
    const _state = {
        curlang: 'en',
        availlangs: ['en'],
        langselector: '',
        otherlangs: ['ta','sa'],
        otherscripts: ['ta-Taml'],
        savedtext: new Map(),
        parEl: null
    };
    
    const Sanscript = window.Sanscript ? window.Sanscript : null;

    const init = function(par) {

        // prepare transliteration functions

        const langtags = [...document.getElementsByClassName('record_languages')];
        const langs = langtags.reduce((acc,cur) => {
            const arr = acc;
            if(cur.dataset.mainlang) arr.push(cur.dataset.mainlang);
            if(cur.dataset.otherlangs) 
                cur.dataset.otherlangs.split(' ').forEach(str => arr.push(str));
            return arr;
        },[]);
        if(langs.includes('tam')) {
            _state.availlangs.push('ta-tamil');
            _state.langselector = _state.langselector + '[lang|="ta"]';
        }
        if(langs.includes('san')) {
            const scripttags = [...document.getElementsByClassName('record_scripts')];
            const scripts = scripttags.reduce((acc,cur) => {
                cur.dataset.script.split(' ').forEach(str => acc.push(str));
                return acc;
            },[]);
            if(scripts.includes('bengali'))
                _state.availlangs.push('sa-bengali');
            if(scripts.includes('grantha'))
                _state.availlangs.push('sa-grantha');
            if(scripts.includes('telugu'))
                _state.availlangs.push('sa-telugu');
            if(scripts.includes('devanagari'))
                _state.availlangs.push('sa-devanagari');
            _state.langselector = _state.langselector + '[lang|="sa"]';
        }
        
        _state.parEl = par || document.body; 
        if(!_state.parEl.lang) _state.parEl.lang = 'en';

        const walker = document.createTreeWalker(_state.parEl,NodeFilter.SHOW_ALL);
        var curnode = walker.currentNode;
        while(curnode) {
            if(curnode.nodeType === Node.ELEMENT_NODE) {
                if(!curnode.lang) curnode.lang = curnode.parentNode.lang;
            }
            else if(curnode.nodeType === Node.TEXT_NODE) {
                const curlang = curnode.parentNode.lang.replace(/-\w+$/,'');
                if(_state.otherlangs.includes(curlang))
                    curnode.data = cacheText(curnode);
            }
            curnode = walker.nextNode();
        }
        
        const button = document.getElementById('transbutton');
        if(_state.availlangs.length > 1)
            button.addEventListener('click',events.transClick);
        else button.style.display = 'none';

    };

    const events = {
        transClick: function(e) {
            const i = _state.availlangs.indexOf(_state.curlang);
            const nexti = _state.availlangs.length === i+1 ? 0 : i+1;
            const vpos = window.viewPos.getVP(_state.parEl);
            cycleScript(e.target,_state.curlang,_state.availlangs[nexti]);
            window.viewPos.setVP(_state.parEl,vpos);
        },
    };

    const cycleScript = function(button,from,to) {
        const parselangcode = function(str) {
            const s = str.split('-');
            return {
                lang: s[0],
                script: s.length > 1 ? s[1] : ''
            };
        };

        const parsedlang = parselangcode(from);
        if(parsedlang.script) button.classList.remove(parsedlang.script);

        if(to === 'en') {
            const nodes = document.querySelectorAll(_state.langselector);
            for(const n of nodes) {
                parsedlang.script ? 
                    n.classList.remove(parsedlang.lang,parsedlang.script) :
                    n.classList.remove(parsedlang.lang);
            }
            textWalk(walkers.roman,parsedlang.lang);
            button.innerHTML = 'A';
        }
        else {
            const [lang,script] = to.split('-');
            const nodes = document.querySelectorAll(`[lang|="${lang}"]`);
            for(const n of nodes) {
                n.classList.add(lang,script);
                parsedlang.script ?
                    n.classList.remove(parsedlang.lang,parsedlang.script) :
                    n.classList.remove(parsedlang.lang);
            }
            textWalk(walkers[to],lang);
            button.innerHTML = Sanscript.t('a','iast',script);
            button.classList.add(script);
        }
        _state.curlang = to;
    };

    const cacheText = function(txtnode) {
        const lang = txtnode.parentNode.lang;
        const hyphenlang = lang === 'ta-Taml' ? 'ta' :
            lang === 'ta' ? 'ta-Latn' : 'sa';
        const hyphenated = window['Hypher']['languages'][hyphenlang].hyphenateText(txtnode.data);
        _state.savedtext.set(txtnode,hyphenated);
        if(lang === 'ta-Taml')
            return to.iast(hyphenated);
        else return hyphenated;
    };
    
    const textWalk = function(func,langcode) {
        const puncs = _state.parEl.querySelectorAll(`.invisible[lang=${langcode}]`);
        if(func !== walkers.roman) {
            for(const p of puncs) {
                p.classList.add('off');
                const prev = p.previousSibling;
                const next = p.nextSibling;
                if(prev && (prev.nodeType === Node.TEXT_NODE) &&
                   next && (next.nodeType === Node.TEXT_NODE)) {
                    next.data = prev.data + next.data;
                    prev.data = '';
                    
                }
            }
            // to improve: check for adjacent invisible nodes
        } else {
            for(const p of puncs) p.classList.remove('off');
        }
    
        const walker = document.createTreeWalker(_state.parEl,NodeFilter.SHOW_TEXT);
        var curnode = walker.currentNode;
        while(curnode) {
            const code = curnode.parentNode.lang.replace(/-\w+$/,'');
            if(_state.otherlangs.includes(code)) {
                const result = func(curnode);
                if(result) curnode.data = result;
            }
            curnode = walker.nextNode();
        }
    };
    
    const walkers = {
        'ta-tamil': function(txtnode) {
            if(txtnode.parentNode.lang === 'ta')
                return to.tamil(txtnode.data);
            else if(txtnode.parentNode.lang === 'ta-Taml')
                return _state.savedtext.get(txtnode);
        },
        'sa-devanagari': function(txtnode) {
            if(txtnode.parentNode.lang === 'sa')
                return to.devanagari(txtnode.data);
        },
        'sa-telugu': function(txtnode) {
            if(txtnode.parentNode.lang === 'sa')
                return to.telugu(txtnode.data);
        },
        'sa-bengali': function(txtnode) {
            if(txtnode.parentNode.lang === 'sa')
                return to.bengali(txtnode.data);
        },

        roman: function(txtnode) {
            if(_state.otherlangs.includes(txtnode.parentNode.lang))
                return _state.savedtext.get(txtnode);
            else if(txtnode.parentNode.lang === 'ta-Taml')
                return to.iast(txtnode.data);
        },
    };

    const to = {

        smush: function(text,placeholder) {
            text = text.toLowerCase();
        
            // remove space between a word that ends in a consonant and a word that begins with a vowel
            text = text.replace(/([ḍdrmvynhs]) ([aāiīuūṛeēoōêô])/g, '$1$2'+placeholder);
        
            // remove space between a word that ends in a consonant and a word that begins with a consonant
            text = text.replace(/([kgcjñḍtdnpbmrlyvśṣsṙ]) ([kgcjṭḍtdnpbmyrlvśṣshḻ])/g, '$1'+placeholder+'$2');

            // join final o/e/ā and avagraha/anusvāra
            text = text.replace(/([oōeēā]) ([ṃ'])/g,'$1'+placeholder+'$2');

            text = text.replace(/ü/g,'\u200Cu');
            text = text.replace(/ï/g,'\u200Ci');

            text = text.replace(/_{1,2}(?=\s*)/g, function(match) {
                if(match === '__') return '\u200D';
                else if(match === '_') return '\u200C';
            });

            return text;
        },

        iast: function(text,from) {
            const f = from || 'tamil';
            return Sanscript.t(text,f,'iast')
                .replace(/^⁰|([^\d⁰])⁰/g,'$1¹⁰')
                .replace(/l̥/g,'ḷ');
        },
        
        tamil: function(text/*,placeholder*/) {
            /*const pl = placeholder || '';
            const txt = to.smush(text,pl);
            return Sanscript.t(txt,'iast','tamil');*/
            const grv = new Map([
                ['\u0B82','\u{11300}'],
                ['\u0BBE','\u{1133E}'],
                ['\u0BBF','\u{1133F}'],
                ['\u0BC0','\u{11340}'],
                ['\u0BC2','\u{11341}'],
                ['\u0BC6','\u{11342}'],
                ['\u0BC7','\u{11347}'],
                ['\u0BC8','\u{11348}'],
                ['\u0BCA','\u{1134B}'],
                ['\u0BCB','\u{1134B}'],
                ['\u0BCC','\u{1134C}'],
                ['\u0BCD','\u{1134D}'],
                ['\u0BD7','\u{11357}']
            ]);
            const grc = ['\u{11316}','\u{11317}','\u{11318}','\u{1131B}','\u{1131D}','\u{11320}','\u{11321}','\u{11322}','\u{11325}','\u{11326}','\u{11327}','\u{1132B}','\u{1132C}','\u{1132D}'];

            const smushed = text
                .replace(/([kṅcñṭṇtnpmyrlvḻḷṟṉ])\s+([aāiīuūeēoō])/g, '$1$2')
                .replace(/ḷ/g,'l̥')
                .toLowerCase();
            const rgex = new RegExp(`([${grc.join('')}])([${[...grv.keys()].join('')}])`,'g');
            const pretext = Sanscript.t(smushed,'iast','tamil');
            return pretext.replace(rgex, function(m,p1,p2) {
                return p1+grv.get(p2); 
            });
        },
        
        devanagari: function(txt,placeholder) {

            const pretext = txt.replace(/ṙ/g, 'r')
                .replace(/e/g,'ē')
                .replace(/o(?![ṁḿ])/g,'ō')
                .replace(/(^|\s)_ā/g,'$1\u093D\u200D\u093E')
                .replace(/(^|\s)_r/g,'$1\u093D\u200D\u0930\u094D');

            const smushed = to.smush(pretext, (placeholder || '') );

            const text = Sanscript.t(smushed,'iast','devanagari')
                .replace(/¯/g, 'ꣻ');

            return text;
        },

        bengali: function(txt,placeholder) {

            const pretext = txt.replace(/ṙ/g, 'r')
                .replace(/e/g,'ē')
                .replace(/o(?![ṁḿ])/g,'ō')
                .replace(/(^|\s)_ā/g,'$1\u093D\u200D\u093E')
                .replace(/(^|\s)_r/g,'$1\u093D\u200D\u0930\u094D');

            const smushed = to.smush(pretext, (placeholder || '') );

            const text = Sanscript.t(smushed,'iast','bengali')
                .replace(/¯/g, 'ꣻ');

            return text;
        },

        telugu: function(txt,placeholder) {

            const pretext = txt.replace(/(^|\s)_ā/,'$1\u0C3D\u200D\u0C3E')
                .replace(/(^|\s)_r/,'$1\u0C3D\u200D\u0C30\u0C4D');
            // FIXME: should be moved to the right of the following consonant

            const smushedtext = to.smush(pretext,(placeholder || ''));        
            const posttext = smushedtext.replace(/ê/g,'e') // no pṛṣṭhamātrās
                .replace(/ô/g,'o') // same with o
                .replace(/ṙ/g,'r\u200D') // valapalagilaka
                //.replace(/ṁ/g,'ṃ') // no telugu oṃkāra sign
                .replace(/ḿ/g,'ṃ')
                .replace(/î/g,'i') // no pṛṣṭhamātrās
                .replace(/û/g,'u');

            return Sanscript.t(posttext,'iast','telugu');
        },
    };
     
    return {
        init: init,
    };
    //window.addEventListener('load',init);
}());
