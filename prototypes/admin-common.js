
window.PrototypeUI=(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
function toast(text){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.append(t)}t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3000)}
const icon=id=>'<svg aria-hidden="true"><use href="#'+id+'"/></svg>';
const statusNames={NOT_SENT:'未发送',PENDING:'处理中',SUCCESS:'发送成功',FAILED:'发送失败',DISABLED:'已禁用'};
const statusClasses={NOT_SENT:'',PENDING:'pending',SUCCESS:'success',FAILED:'failed',DISABLED:''};
const gifts={PICKUP:'到场领取',MAIL:'邮寄',NONE:'不领取'};
const badge=status=>'<span class="pill '+(statusClasses[status]||'')+'">'+(statusNames[status]||status)+'</span>';
function show({title,subtitle='',body,footer='',drawer=false}){
document.getElementById('prototype-dialog')?.close();
const d=document.createElement('dialog');d.id='prototype-dialog';d.className=drawer?'drawer':'';
d.setAttribute('aria-labelledby','dialog-title');d.innerHTML='<div class="dialog-layout"><header class="dialog-head"><div><h2 id="dialog-title">'+esc(title)+'</h2><p>'+esc(subtitle)+'</p></div><button class="close-btn" aria-label="关闭">×</button></header><div class="dialog-body">'+body+'</div><footer class="dialog-foot">'+footer+'</footer></div>';
document.body.append(d);d.showModal();
const close=()=>{if(d.dataset.dirty==='true'){ask('放弃未保存的修改？','关闭后，本次尚未保存的内容将丢失。','放弃修改',()=>d.close(),true)}else d.close()};
d.querySelector('.close-btn').onclick=close;d.addEventListener('cancel',e=>{if(d.dataset.dirty==='true'){e.preventDefault();close()}});
d.addEventListener('close',()=>d.remove(),{once:true});d.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
return d;
}
function ask(title,text,label,callback,danger=false){
const d=document.createElement('dialog');d.style.width='430px';d.innerHTML='<div class="dialog-head"><h2>'+esc(title)+'</h2></div><div class="dialog-body" style="font-size:13px;color:#8491a7">'+esc(text)+'</div><div class="dialog-foot"><button class="btn" data-cancel>取消</button><button class="btn '+(danger?'danger-fill':'primary')+'" data-confirm>'+esc(label)+'</button></div>';
document.body.append(d);d.showModal();d.querySelector('[data-cancel]').onclick=()=>d.close();d.querySelector('[data-confirm]').onclick=()=>{d.close();callback()};d.addEventListener('close',()=>d.remove(),{once:true});
}
function zoom(src,caption){const d=document.createElement('dialog');d.className='lightbox';d.innerHTML='<button class="close-btn" aria-label="关闭图片">×</button><img src="'+esc(src)+'" alt="'+esc(caption)+'"><div class="lightbox-caption">'+esc(caption)+'</div>';document.body.append(d);d.showModal();d.querySelector('button').onclick=()=>d.close();d.addEventListener('close',()=>d.remove(),{once:true})}
function changed(){document.dispatchEvent(new Event('demo:changed'))}
function item(label,value,full=false){return '<div class="info-item '+(full?'full':'')+'"><label>'+label+'</label>'+value+'</div>'}
function receipt(id){const r=Demo.receipts().find(r=>r.id===String(id));if(!r){toast('没有找到该回执');return null}return r}
function historyHTML(r){
if(!r.history.length)return '<div class="history-empty">'+icon('mail')+'<strong>还没有发送记录</strong><p>核对回执后，预览并确认发送第一封邮件。</p></div>';
return '<div class="note" style="margin-bottom:18px">记录包含确认时的回执内容。修改回执不会自动补发邮件，旧记录会保留。</div><div class="history-list">'+[...r.history].reverse().map(h=>'<article class="history-card"><div class="history-top"><strong>第 '+h.sendNo+' 次发送 <span class="honor-small">· 回执 v'+h.version+(h.version!==r.version?' · 历史版本':' · 当前版本')+'</span></strong>'+badge(h.status)+'</div><div class="history-meta">收件邮箱：'+esc(h.recipient)+'<br>确认人员：'+esc(h.operator)+'<br>确认时间：'+esc(h.confirmed)+(h.sentAt?'<br>发送成功：'+esc(h.sentAt):'')+'</div>'+(h.status==='FAILED'?'<div class="note error">邮件服务 SMTP 最终发送超时。请先联系服务维护人员排查，再手动确认重发。</div>':h.status==='PENDING'?'<div class="note">任务已登记，等待邮件服务处理。当前演示不会发送真实邮件。</div>':'')+'</article>').join('')+'</div>';
}
function detail(id,tab='info'){
const r=receipt(id);if(!r)return;
const d=show({title:'报名详情',subtitle:'回执 #'+r.id+' · 查看回执与邮件记录',drawer:true,body:
'<div class="summary-box"><div class="person-icon">'+esc(r.name[0])+'</div><div><strong>'+esc(r.name)+'</strong><small>回执 v'+r.version+' · '+esc(r.updated)+' 更新</small></div>'+badge(r.status)+'</div>'+
'<div class="tabs"><button class="tab '+(tab==='info'?'active':'')+'" data-tab="info">回执信息</button><button class="tab '+(tab==='history'?'active':'')+'" data-tab="history">邮件记录 <span class="count">'+r.history.length+'</span></button></div>'+
(tab==='history'?historyHTML(r):'<div class="section-label">基本信息</div><div class="info-grid">'+item('姓名',esc(r.name))+item('手机号',esc(r.phone))+item('邮箱',esc(r.email),true)+item('是否到场','<span class="pill '+(r.attendance==='ATTENDING'?'attend':'')+'">'+(r.attendance==='ATTENDING'?'到场':'不到场')+'</span>')+item('礼物领取方式',gifts[r.gift])+(r.gift==='MAIL'?item('邮寄地址',esc(r.address),true):'')+'</div><div class="section-label">邮件通知</div><div class="note">报名回执保存后不会自动发信。请先预览收件邮箱和正文，再确认发送。</div><div class="detail-meta"><span>回执编号 #'+r.id+'</span><span>最近更新 '+esc(r.updated)+'</span></div>'),
footer:'<button class="btn" data-close>关闭</button><button class="btn" data-edit>修改回执</button><button class="btn primary" data-mail>预览邮件</button>'});
d.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>detail(id,b.dataset.tab));d.querySelector('[data-edit]').onclick=()=>edit(id);d.querySelector('[data-mail]').onclick=()=>mail(id);
}
function edit(id){
const r=receipt(id);if(!r)return;
const d=show({title:'修改报名回执',subtitle:'回执 #'+r.id+' · 保存修改不会自动发送邮件',drawer:true,
body:'<form id="receipt-edit" novalidate><div class="form-grid">'+
'<div class="form-field"><label for="edit-name">姓名<span class="required">*</span></label><input id="edit-name" name="name" maxlength="50" value="'+esc(r.name)+'"><span class="field-error"></span></div>'+
'<div class="form-field"><label for="edit-phone">手机号</label><input id="edit-phone" value="'+esc(r.phone)+'" disabled><span class="help">手机号用于识别回执，不支持在此修改。</span></div>'+
'<div class="form-field full"><label for="edit-email">邮箱<span class="required">*</span></label><input id="edit-email" name="email" type="email" maxlength="254" value="'+esc(r.email)+'"><span class="field-error"></span></div>'+
'<div class="form-field full"><label>是否到场<span class="required">*</span></label><div class="radio-row"><label class="radio-option"><input type="radio" name="attendance" value="ATTENDING" '+(r.attendance==='ATTENDING'?'checked':'')+'>到场</label><label class="radio-option"><input type="radio" name="attendance" value="NOT_ATTENDING" '+(r.attendance==='NOT_ATTENDING'?'checked':'')+'>不到场</label></div></div>'+
'<div class="form-field full"><label for="edit-gift">礼物领取方式<span class="required">*</span></label><select id="edit-gift" name="gift"></select><span class="help" id="gift-help"></span></div>'+
'<div class="form-field full" id="address-field"><label for="edit-address">邮寄地址<span class="required">*</span></label><textarea id="edit-address" name="address" maxlength="500" placeholder="请填写完整的收件地址">'+esc(r.gift==='MAIL'?r.address:'')+'</textarea><span class="field-error"></span></div></div>'+
'<div class="note warning" style="margin-top:24px">修改邮箱、到场状态或礼物方式后，需重新预览邮件并由管理员确认发送。</div></form>',
footer:'<span class="foot-note">带 * 的字段为必填项</span><button class="btn" data-close>取消</button><button class="btn primary" type="submit" form="receipt-edit">保存修改</button>'});
const f=d.querySelector('form'),gift=f.elements.gift;
function address(){d.querySelector('#address-field').hidden=gift.value!=='MAIL'}
function options(initial=false){const attending=f.elements.attendance.value==='ATTENDING',selected=initial?r.gift:gift.value;gift.innerHTML=(attending?'<option value="PICKUP">到场领取</option>':'')+'<option value="MAIL">邮寄</option><option value="NONE">不领取</option>';gift.value=(!attending&&selected==='PICKUP')?'NONE':selected;d.querySelector('#gift-help').textContent=attending?'':'选择不到场时，不提供到场领取选项。';address()}
options(true);f.addEventListener('input',e=>{d.dataset.dirty='true';const field=e.target.closest('.form-field');if(field?.classList.contains('invalid')){field.classList.remove('invalid');field.querySelector('.field-error').textContent=''}});f.addEventListener('change',e=>{d.dataset.dirty='true';if(e.target.name==='attendance')options();if(e.target.name==='gift')address()});
f.onsubmit=e=>{e.preventDefault();clearErrors(f);let valid=true;const name=f.elements.name.value.trim(),email=f.elements.email.value.trim(),addr=f.elements.address.value.trim();
if(!name){error(f.elements.name,'请填写姓名');valid=false}
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){error(f.elements.email,'请填写有效的邮箱地址');valid=false}
if(gift.value==='MAIL'&&!addr){error(f.elements.address,'请选择邮寄时填写完整地址');valid=false}
if(!valid)return;
const update={name,email,attendance:f.elements.attendance.value,gift:gift.value,address:gift.value==='MAIL'?addr:''};
const hasChanged=Object.entries(update).some(([k,v])=>v!==(k==='address'&&r.gift!=='MAIL'?'':r[k]));
if(hasChanged)Object.assign(r,update,{version:r.version+1,status:'NOT_SENT',updated:Demo.now()});
Demo.saveReceipt(r);d.dataset.dirty='false';d.close();changed();toast(hasChanged?'回执已更新，未自动发送邮件':'内容没有变化，已保留原回执');detail(id)};
}
function clearErrors(form){form.querySelectorAll('.invalid').forEach(x=>x.classList.remove('invalid'));form.querySelectorAll('.field-error').forEach(x=>x.textContent='')}
function error(input,text){const p=input.closest('.form-field');p.classList.add('invalid');p.querySelector('.field-error').textContent=text}
function mail(id){
const r=receipt(id);if(!r)return;
const text=r.name+'，你好！\n\n已收到你的回执。\n到场选择：'+(r.attendance==='ATTENDING'?'到场':'不到场')+'\n礼物选择：'+gifts[r.gift]+'\n回执编号：'+r.id+'\n\n期待与你再次相聚。\nSIPC 十六周年';
const d=show({title:'预览确认邮件',subtitle:'核对收件人及回执内容，再确认发送',
body:'<div class="mail-meta"><div><label>收件人</label><strong>'+esc(r.email)+'</strong></div><div><label>主题</label>社团十六周年邀请函回执确认</div><div><label>回执版本</label>v'+r.version+'</div></div><div class="mail-paper">'+esc(text)+'</div><div class="note" style="margin-top:18px">确认后登记发送任务。邮件是否发送成功，以发送记录中的最终结果为准。本原型不会发送真实邮件。</div><label class="confirm-check"><input id="mail-checked" type="checkbox">我已核对收件邮箱及邮件正文</label>',
footer:'<button class="btn" data-close>取消</button><button class="btn primary" id="confirm-mail" disabled>确认发送</button>'});
const button=d.querySelector('#confirm-mail');d.querySelector('#mail-checked').onchange=e=>button.disabled=!e.target.checked;
button.onclick=()=>{
const current=receipt(id);if(current.version!==r.version){toast('回执已更新，请重新预览邮件');mail(id);return}
const active=current.history.find(h=>h.version===r.version&&h.status==='PENDING');
if(!active){const sendNo=current.history.filter(h=>h.version===r.version).length+1;current.history.push({id:crypto.randomUUID?.()||String(Date.now()),version:r.version,sendNo,status:'PENDING',recipient:r.email,confirmed:Demo.now(),operator:'管理员',sentAt:null});current.status='PENDING';Demo.saveReceipt(current);changed()}
d.close();const result=show({title:active?'已有发送任务处理中':'发送任务已登记',subtitle:'请在发送记录中关注后续状态',body:'<div class="history-empty" style="padding:25px 10px">'+icon('check')+'<strong>'+esc(r.email)+'</strong><p>'+(active?'已复用同一版本的处理中任务，避免重复发送。':'邮件已进入待处理状态。这并不表示收件人已经收到邮件。')+'</p></div><div class="note">当前是交互原型，任务保留为“处理中”，不会调用邮件服务。</div>',footer:'<button class="btn" data-close>完成</button><button class="btn primary" data-history>查看发送记录</button>'});result.querySelector('[data-history]').onclick=()=>detail(id,'history');
};
}
return{esc,icon,toast,show,ask,zoom,changed,badge,gifts,clearErrors,error,detail,edit,mail};
})();
