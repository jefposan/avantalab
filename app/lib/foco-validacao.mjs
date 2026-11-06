/** Foco de validação compartilhado: mantém o erro visível até a edição. */
export function focarCampoComErro(target,{message='',id='av-validation-error'}={}) {
 if(!target?.focus)return()=>{};
 const doc=target.ownerDocument,win=doc.defaultView;
 for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 const previousInvalid=target.getAttribute('aria-invalid');
 const described=target.getAttribute('aria-describedby')||'';
 const host=target.closest('label')||target.closest('[data-validation-field]')||target.parentElement||target;
 const note=doc.createElement('span');note.id=id;note.className='av-validation-message';note.textContent=message;
 host.appendChild(note);target.setAttribute('aria-invalid','true');target.setAttribute('aria-describedby',[described,id].filter(Boolean).join(' '));target.classList.add('av-validation-target');
 target.focus({preventScroll:true});
 target.scrollIntoView({block:'center',inline:'nearest',behavior:win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 let cleaned=false;
 const clear=()=>{if(cleaned)return;cleaned=true;note.remove();target.classList.remove('av-validation-target');if(previousInvalid===null)target.removeAttribute('aria-invalid');else target.setAttribute('aria-invalid',previousInvalid);const ids=(target.getAttribute('aria-describedby')||'').split(/\s+/).filter(value=>value&&value!==id);if(ids.length)target.setAttribute('aria-describedby',ids.join(' '));else target.removeAttribute('aria-describedby');target.removeEventListener('input',clear);target.removeEventListener('change',clear);};
 target.addEventListener('input',clear);target.addEventListener('change',clear);return clear;
}
