(()=>{
const UI=PrototypeUI,$=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const draftKey='birthday16-mail-drafts-v1';
const defaultSubject='{{name}}，SIPC 十六周年期待与你重聚';
const defaultBody='{{name}}，你好！\n\n感谢你填写 SIPC 十六周年邀请函回执。\n\n到场选择：{{attendance}}\n礼物领取方式：{{giftChoice}}\n回执编号：{{id}}\n\n那些一起度过的时光，依然闪闪发光。\n期待与你再次相聚！\n\nSIPC';
let drafts;
try{drafts=JSON.parse(localStorage.getItem(draftKey)||'null')}catch(e){drafts=null}
if(!drafts||!drafts.single||!drafts.bulk)drafts={single:{},bulk:{subject:defaultSubject,body:defaultBody}};
let mode=params.get('mode')==='bulk'?'bulk':'single',selected=new Set(),singleId=Demo.receipts().find(r=>r.id===params.get('id'))?.id||Demo.receipts()[0]?.id||null,focusTarget='compose-body';
const variables={name:r=>r.name,attendance:r=>r.attendance==='ATTENDING'?'到场':'不到场',giftChoice:r=>UI.gifts[r.gift],id:r=>r.id};
function inject(template,r){
const unknown=[...template.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map(m=>m[1]).filter(key=>!Object.hasOwn(variables,key));
if(unknown.length)throw new Error('未知变量：'+unknown[0]+'。请使用上方提供的变量。');
const residue=template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g,'');
if(residue.includes('{{')||residue.includes('}}'))throw new Error('变量格式不完整，请使用 {{name}} 这样的格式。');
return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g,(_,key)=>variables[key](r));
}
function defaultSingle(r){return {subject:inject(defaultSubject,r),body:inject(defaultBody,r)}}
function currentDraft(){
if(mode==='bulk')return drafts.bulk;
const r=Demo.receipts().find(r=>r.id===singleId);
if(!r)return {subject:'',body:''};
return drafts.single[singleId]||(drafts.single[singleId]=defaultSingle(r));
}
function saveDraft(notify=false){
const draft=currentDraft();draft.subject=$('compose-subject').value;draft.body=$('compose-body').value;
try{localStorage.setItem(draftKey,JSON.stringify(drafts));$('draft-state').textContent='本机草稿已保存';if(notify)UI.toast(mode==='bulk'?'群发模板草稿已保存':'这位报名者的邮件草稿已保存')}catch(e){$('draft-state').textContent='草稿未能保存';UI.toast('本机存储空间不足，请复制正文后清理空间。')}
counts();
}
function counts(){$('subject-count').textContent=$('compose-subject').value.length+' / 200';$('body-count').textContent=$('compose-body').value.length+' 字'}
function filtered(){
const q=$('recipient-search').value.trim().toLowerCase(),attendance=$('recipient-attendance').value,gift=$('recipient-gift').value,status=$('recipient-status').value;
return Demo.receipts().filter(r=>(!q||[r.name,r.email,r.phone].some(v=>v.toLowerCase().includes(q)))&&(!attendance||r.attendance===attendance)&&(!gift||r.gift===gift)&&(!status||r.status===status));
}
function renderRecipients(){
const rows=filtered(),top=$('recipient-list').scrollTop;$('recipient-count').textContent=rows.length;
$('recipient-list').innerHTML=rows.length?rows.map(r=>{
const content='<span class="person-icon">'+UI.esc(r.name[0])+'</span><span class="recipient-copy"><strong>'+UI.esc(r.name)+'</strong><small>'+UI.esc(r.email)+'</small></span>';
return mode==='single'?'<button class="recipient '+(singleId===r.id?'selected':'')+'" data-single="'+r.id+'" aria-pressed="'+(singleId===r.id)+'">'+content+'<span class="recipient-dot"></span></button>':'<label class="recipient '+(selected.has(r.id)?'selected':'')+'"><input type="checkbox" data-recipient="'+r.id+'" aria-label="选择'+UI.esc(r.name)+'" '+(selected.has(r.id)?'checked':'')+'>'+content+'</label>';
}).join(''):'<div class="recipient-empty">没有匹配的报名者</div>';
$('recipient-list').scrollTop=top;
const checks=rows.filter(r=>selected.has(r.id)).length;
$('select-filtered').checked=rows.length>0&&checks===rows.length;$('select-filtered').indeterminate=checks>0&&checks<rows.length;$('select-filtered').disabled=!rows.length;
renderContext();
}
function targets(){return Demo.receipts().filter(r=>mode==='single'?r.id===singleId:selected.has(r.id))}
function renderContext(){
const recipients=targets();
if(mode==='single'){
const r=recipients[0];$('mail-context').innerHTML=r?'<span class="person-icon">'+UI.esc(r.name[0])+'</span><div class="context-copy"><strong>'+UI.esc(r.name)+'</strong><small>'+UI.esc(r.email)+'</small></div><span class="pill '+(r.attendance==='ATTENDING'?'attend':'')+'">'+(r.attendance==='ATTENDING'?'到场':'不到场')+'</span>':'<span class="help">请选择一位报名者</span>';
$('send-summary').textContent=r?'发送给 1 位报名者':'尚未选择收件人';
}else{
$('mail-context').innerHTML='<div class="context-copy"><strong>已选择 '+recipients.length+' 位报名者</strong>'+(recipients.length?'<div class="selected-emails">'+recipients.slice(0,4).map(r=>'<span class="recipient-tag">'+UI.esc(r.name)+'</span>').join('')+(recipients.length>4?'<span class="recipient-tag">+'+(recipients.length-4)+'</span>':'')+'</div>':'<small>在左侧勾选，或选择当前筛选结果。</small>')+'</div>';
$('send-summary').textContent='将分别生成 '+recipients.length+' 封专属邮件';
}
$('preview-mail').disabled=!recipients.length;
}
function loadFields(){
const draft=currentDraft();$('compose-subject').value=draft.subject;$('compose-body').value=draft.body;clearErrors();counts();$('draft-state').textContent='草稿仅保存在本机';
}
function switchMode(next,preserve=true){
if(preserve)saveDraft();mode=next;
$('single-mode').classList.toggle('active',mode==='single');$('bulk-mode').classList.toggle('active',mode==='bulk');
$('single-mode').setAttribute('aria-selected',mode==='single');$('bulk-mode').setAttribute('aria-selected',mode==='bulk');
$('selection-tools').hidden=mode!=='bulk';$('variable-box').hidden=mode!=='bulk';
$('compose-title').textContent=mode==='bulk'?'编辑群发模板':'编辑专属邮件';
$('mode-description').textContent=mode==='bulk'?'一份模板，为每位收件人生成专属内容':'为每位报名者分别编辑邮件内容';
$('compose-note').textContent=mode==='bulk'?'每位收件人会收到一封单独生成的邮件，不会暴露其他人的邮箱。发送前可逐人核对变量替换结果。':'单发内容可逐人编辑；切换收件人时，将保留各自的本机草稿。';
loadFields();renderRecipients();const url=new URL(location.href);url.searchParams.set('mode',mode);url.searchParams.delete('view');history.replaceState(null,'',url);
}
function clearErrors(){for(const id of ['subject','body']){$(id+'-error').textContent='';$('compose-'+id).closest('.form-field').classList.remove('invalid')}}
function showError(field,message){$(field+'-error').textContent=message;$('compose-'+field).closest('.form-field').classList.add('invalid')}
function buildMessages(){
clearErrors();const subject=$('compose-subject').value.trim(),body=$('compose-body').value.trim();let valid=true;
if(!subject){showError('subject','请填写邮件主题');valid=false}
if(!body){showError('body','请填写邮件正文');valid=false}
if(!valid)return null;
const recipients=targets();if(!recipients.length){UI.toast('请先选择收件人');return null}
const messages=[];
for(const r of recipients){
let renderedSubject=subject,renderedBody=body;
if(mode==='bulk'){
try{renderedSubject=inject(subject,r)}catch(e){showError('subject',e.message);return null}
try{renderedBody=inject(body,r)}catch(e){showError('body',e.message);return null}
}
if([...renderedSubject].length>200){showError('subject',r.name+' 的邮件主题替换变量后超过 200 字，请缩短模板');return null}
if([...renderedBody].length>10000){showError('body',r.name+' 的正文替换变量后过长，请缩短模板');return null}
messages.push({invitationId:r.id,version:r.version,recipient:r.email,name:r.name,subject:renderedSubject,textBody:renderedBody,mode});
}
return messages;
}
function preview(){
saveDraft();const messages=buildMessages();if(!messages)return;
const d=UI.show({title:mode==='bulk'?'群发预览与确认':'单发预览与确认',subtitle:mode==='bulk'?'逐人检查变量替换结果，再确认整个发送批次':'检查收件人与编辑后的邮件内容',
body:'<div class="preview-picker"><label for="preview-recipient">预览收件人</label><select id="preview-recipient">'+messages.map((m,i)=>'<option value="'+i+'">'+UI.esc(m.name)+' · '+UI.esc(m.recipient)+'</option>').join('')+'</select><span class="preview-count" id="preview-position"></span></div><div class="mail-meta"><div><label>收件人</label><strong id="preview-email"></strong></div><div><label>主题</label><span id="preview-subject"></span></div></div><div class="mail-paper" id="preview-body"></div><div class="note" style="margin-top:18px">'+(mode==='bulk'?'将为 '+messages.length+' 位报名者分别生成邮件，所有邮件均需本次确认后才会登记。':'将按当前编辑内容为这位报名者生成邮件。')+'本原型只演示任务登记，不会实际发信。</div><div class="recipients-overview">收件名单：'+messages.map(m=>UI.esc(m.name)).join('、')+'</div><p class="mail-send-error" id="send-error"></p><label class="confirm-check"><input id="confirm-reviewed" type="checkbox">我已核对收件名单、主题与邮件正文</label>',
footer:'<button class="btn" data-close>返回编辑</button><button class="btn primary" id="confirm-send" disabled>确认发送 '+messages.length+' 封邮件</button>'});
d.style.width='min(820px,calc(100vw - 40px))';
function showMessage(){
const i=Number(d.querySelector('#preview-recipient').value),m=messages[i];
d.querySelector('#preview-email').textContent=m.recipient;d.querySelector('#preview-subject').textContent=m.subject;d.querySelector('#preview-body').textContent=m.textBody;d.querySelector('#preview-position').textContent=(i+1)+' / '+messages.length;
}
d.querySelector('#preview-recipient').onchange=showMessage;showMessage();
d.querySelector('#confirm-reviewed').onchange=e=>d.querySelector('#confirm-send').disabled=!e.target.checked;
d.querySelector('#confirm-send').onclick=()=>{
const button=d.querySelector('#confirm-send');button.disabled=true;
try{
const batchId=crypto.randomUUID?.()||String(Date.now()),jobs=messages.map(m=>({...m,id:crypto.randomUUID?.()||String(Date.now())+m.invitationId,batchId}));
Demo.saveMailBatch(jobs);d.close();UI.changed();renderContext();
const result=UI.show({title:'发送任务已登记',subtitle:messages.length+' 封邮件 · '+(mode==='bulk'?'群发模式':'单发模式'),
body:'<div class="history-empty" style="padding:25px 10px">'+UI.icon('check')+'<strong>'+messages.length+' 封邮件已登记</strong><p>每封邮件均保存了对应收件人和确认时的完整正文。</p></div><div class="note">当前为原型演示，记录保持“处理中”。任务登记不等于邮件已投递成功。</div>',
footer:'<button class="btn" data-close>完成</button><button class="btn primary" id="view-new-records">查看发送记录</button>'});
result.querySelector('#view-new-records').onclick=()=>records({batchId});
}catch(e){d.querySelector('#send-error').textContent=e.message;button.disabled=false}
};
}
function allRecords(){
return Demo.receipts().flatMap(r=>(r.history||[]).map(h=>({...h,invitationId:r.id,name:r.name,subject:h.subject||'社团十六周年邀请函回执确认',mode:h.mode||'legacy'}))).sort((a,b)=>b.confirmed.localeCompare(a.confirmed));
}
function records(filter={}){
const d=UI.show({title:'邮件发送记录',subtitle:filter.batchId?'本次发送批次 · 每位报名者一条独立记录':'查看单发、群发及已有确认邮件记录',
body:'<div class="record-toolbar"><input id="record-search" placeholder="搜索收件人、邮箱或主题" aria-label="搜索发送记录"><select id="record-status" aria-label="发送状态筛选"><option value="">全部状态</option><option value="PENDING">处理中</option><option value="SUCCESS">发送成功</option><option value="FAILED">发送失败</option></select></div><div class="table-wrap"><table class="mail-record-table"><thead><tr><th>收件人</th><th>主题</th><th>状态</th><th>操作</th></tr></thead><tbody id="mail-record-rows"></tbody></table></div><div class="help" id="record-count" style="margin-top:17px"></div>',
footer:'<button class="btn" data-close>关闭</button>'});
d.style.width='min(930px,calc(100vw - 40px))';
let visible=[];
function render(){
const q=d.querySelector('#record-search').value.toLowerCase().trim(),status=d.querySelector('#record-status').value;
visible=allRecords().filter(h=>(!filter.batchId||h.batchId===filter.batchId)&&(!filter.id||h.invitationId===filter.id)&&(!status||h.status===status)&&(!q||[h.name,h.recipient,h.subject].some(v=>v.toLowerCase().includes(q))));
d.querySelector('#mail-record-rows').innerHTML=visible.length?visible.map((h,i)=>'<tr><td>'+UI.esc(h.name)+'<div class="record-meta">'+UI.esc(h.recipient)+'</div></td><td><div class="record-subject">'+UI.esc(h.subject)+'</div><div class="record-meta">'+(h.mode==='bulk'?'群发':h.mode==='single'?'单发':'回执确认')+' · '+UI.esc(h.confirmed)+'</div></td><td>'+UI.badge(h.status)+'</td><td><button class="text-btn" data-record="'+i+'">查看正文</button></td></tr>').join(''):'<tr><td colspan="4" class="record-empty">没有匹配的发送记录</td></tr>';
d.querySelector('#record-count').textContent='共 '+visible.length+' 条记录 · 修改草稿不会改变已登记的邮件内容';
}
d.querySelector('#record-search').oninput=render;d.querySelector('#record-status').onchange=render;
d.querySelector('#mail-record-rows').onclick=e=>{
const b=e.target.closest('[data-record]');if(!b)return;const h=visible[Number(b.dataset.record)];
const record=UI.show({title:'邮件记录详情',subtitle:(h.mode==='bulk'?'群发邮件':h.mode==='single'?'单发邮件':'回执确认邮件')+' · '+h.confirmed,
body:'<div class="mail-meta"><div><label>收件人</label>'+UI.esc(h.name)+' · '+UI.esc(h.recipient)+'</div><div><label>主题</label>'+UI.esc(h.subject)+'</div><div><label>状态</label>'+UI.badge(h.status)+'</div></div><div class="mail-paper">'+UI.esc(h.textBody||'这是一条原型内置历史记录，未保存自定义正文快照。')+'</div>'+(h.status==='FAILED'?'<div class="note error" style="margin-top:17px">邮件服务 SMTP 最终发送超时。请联系服务维护人员排查后，再手动确认重发。</div>':''),
footer:'<button class="btn" id="back-records">返回记录</button><button class="btn primary" id="write-again">为此人写邮件</button>'});
record.querySelector('#back-records').onclick=()=>records(filter);record.querySelector('#write-again').onclick=()=>{record.close();saveDraft();singleId=h.invitationId;switchMode('single',false)};
};
render();
}
$('single-mode').onclick=()=>switchMode('single');$('bulk-mode').onclick=()=>switchMode('bulk');
$('recipient-search').oninput=renderRecipients;$('recipient-attendance').onchange=renderRecipients;$('recipient-gift').onchange=renderRecipients;$('recipient-status').onchange=renderRecipients;
$('recipient-list').onclick=e=>{const b=e.target.closest('[data-single]');if(b){saveDraft();singleId=b.dataset.single;loadFields();renderRecipients()}};
$('recipient-list').onchange=e=>{const id=e.target.dataset.recipient;if(!id)return;if(e.target.checked)selected.add(id);else selected.delete(id);renderRecipients()};
$('select-filtered').onchange=e=>{for(const r of filtered()){if(e.target.checked)selected.add(r.id);else selected.delete(r.id)}renderRecipients()};
$('clear-selection').onclick=()=>{selected.clear();renderRecipients()};
for(const id of ['compose-subject','compose-body']){$(id).onfocus=()=>focusTarget=id;$(id).oninput=()=>{clearErrors();saveDraft()}}
document.querySelectorAll('[data-variable]').forEach(b=>b.onclick=()=>{const input=$(focusTarget),token='{{'+b.dataset.variable+'}}';const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;if(input.value.length-(end-start)+token.length>input.maxLength){UI.toast('当前字段已达到长度上限');return}input.setRangeText(token,start,end,'end');input.focus();clearErrors();saveDraft()});
$('save-draft').onclick=()=>saveDraft(true);$('preview-mail').onclick=preview;$('mail-history').onclick=()=>records();
document.querySelector('.exit').onclick=()=>UI.ask('退出登录？','当前仅演示退出确认，不会退出真实 SSO 账户。','确认退出',()=>UI.toast('退出确认已演示'));
switchMode(mode,false);
if(params.get('view')==='history')records({id:params.get('id')||undefined});
})();
