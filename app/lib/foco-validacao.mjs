/** Foco compartilhado. messageElement reutiliza um aviso existente, sem criar/remover cópia. */
export function focarCampoComErro(target,{message='',id='av-validation-error',messageElement=null}={}) {
 if(!target?.focus)return()=>{};
 const doc=target.ownerDocument,win=doc.defaultView;
 for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 const previousInvalid=target.getAttribute('aria-invalid');
 const described=target.getAttribute('aria-describedby')||'';
 const host=target.closest('label')||target.closest('[data-validation-field]')||target.parentElement||target;
 const ownsMessage=!messageElement;
 const note=messageElement||doc.createElement('span');
 if(ownsMessage){note.id=id;note.className='av-validation-message';note.textContent=message;host.appendChild(note);}
 const messageId=note.id||id;target.setAttribute('aria-invalid','true');target.setAttribute('aria-describedby',[described,messageId].filter(Boolean).join(' '));target.classList.add('av-validation-target');
 target.focus({preventScroll:true});
 target.scrollIntoView({block:'center',inline:'nearest',behavior:win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 let cleaned=false;
 const clear=()=>{if(cleaned)return;cleaned=true;if(ownsMessage)note.remove();target.classList.remove('av-validation-target');if(previousInvalid===null)target.removeAttribute('aria-invalid');else target.setAttribute('aria-invalid',previousInvalid);const ids=(target.getAttribute('aria-describedby')||'').split(/\s+/).filter(value=>value&&value!==messageId);if(ids.length)target.setAttribute('aria-describedby',ids.join(' '));else target.removeAttribute('aria-describedby');target.removeEventListener('input',clear);target.removeEventListener('change',clear);};
 target.addEventListener('input',clear);target.addEventListener('change',clear);return clear;
}
