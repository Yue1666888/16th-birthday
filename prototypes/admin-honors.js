
(()=>{
const UI=PrototypeUI,$=id=>document.getElementById(id);
let page=1;
function render(){
const honors=Demo.honors(),size=Number($('honor-size').value),pages=Math.max(1,Math.ceil(honors.length/size));page=Math.min(page,pages);
$('honor-count').textContent=honors.length;
$('honor-summary').textContent='共 '+honors.length+' 项荣誉 · '+honors.reduce((n,h)=>n+h.images.length,0)+' 张图片';
$('honor-rows').innerHTML=honors.length?honors.slice((page-1)*size,page*size).map(h=>'<tr><td><button style="border:0;background:none;padding:0;display:block" data-view="'+h.id+'" aria-label="查看'+UI.esc(h.title)+'"><img class="honor-thumb" src="'+UI.esc(h.images[0])+'" alt="'+UI.esc(h.title)+'"></button></td><td><div class="honor-title">'+UI.esc(h.title)+'</div><div class="honor-small">'+h.images.length+' 张图片</div></td><td><div class="honor-people">'+UI.esc(h.people)+'</div></td><td class="date">'+UI.esc(h.updated)+'</td><td><div class="row-actions"><button class="text-btn" data-view="'+h.id+'">查看</button><button class="text-btn" data-edit="'+h.id+'">编辑</button><span class="separator"></span><button class="text-btn danger-text" data-delete="'+h.id+'">删除</button></div></td></tr>').join(''):'<tr class="empty"><td colspan="5">还没有荣誉记录，点击“新增荣誉”添加第一项。</td></tr>';
$('honor-range').textContent='共 '+honors.length+' 项荣誉';
$('honor-pages').innerHTML='<button class="page-btn" aria-label="上一页" data-page="'+(page-1)+'" '+(page===1?'disabled':'')+'>'+UI.icon('left')+'</button>'+Array.from({length:pages},(_,i)=>'<button class="page-btn '+(page===i+1?'active':'')+'" data-page="'+(i+1)+'">'+(i+1)+'</button>').join('')+'<button class="page-btn" aria-label="下一页" data-page="'+(page+1)+'" '+(page===pages?'disabled':'')+'>'+UI.icon('right')+'</button>';
}
function view(id){
const h=Demo.honors().find(h=>h.id===id);if(!h)return;
const d=UI.show({title:'荣誉详情',subtitle:'查看公开展示的标题、人员与图片',drawer:true,
body:'<div class="section-label">'+UI.esc(h.title)+'</div><div class="info-item"><label>人员</label>'+UI.esc(h.people)+'</div><div class="section-label">荣誉图片 <span class="count">'+h.images.length+'</span></div><div class="photo-grid">'+h.images.map((src,i)=>'<div class="photo-tile"><img src="'+UI.esc(src)+'" alt="荣誉图片 '+(i+1)+'" data-zoom="'+i+'">'+(i===0?'<span class="cover-tag">封面</span>':'')+'</div>').join('')+'</div><div class="detail-meta"><span>最近更新 '+UI.esc(h.updated)+'</span><span>v'+h.version+'</span></div>',
footer:'<button class="btn" data-close>关闭</button><button class="btn primary" data-edit>编辑荣誉</button>'});
d.querySelector('[data-edit]').onclick=()=>editor(id);d.querySelectorAll('[data-zoom]').forEach(img=>img.onclick=()=>UI.zoom(h.images[Number(img.dataset.zoom)],h.title));
}
function remove(id){
const h=Demo.honors().find(h=>h.id===id);if(!h)return;
UI.ask('删除这项荣誉？','“'+h.title+'”将从荣誉墙移除，公开页面不再展示。','确认删除',()=>{Demo.deleteHonor(id);render();UI.toast('荣誉已从列表移除')},true);
}
function editor(id){
const h=id?Demo.honors().find(h=>h.id===id):null;let images=h?[...h.images]:[],uploading=false,dragIndex=null;
const d=UI.show({title:h?'编辑荣誉':'新增荣誉',subtitle:'保存后将直接展示在公开荣誉墙',drawer:true,
body:'<form id="honor-edit" novalidate><div class="form-grid"><div class="form-field full"><label for="honor-title">标题<span class="required">*</span></label><input id="honor-title" name="title" maxlength="100" placeholder="例如：中国大学生计算机设计大赛 · 全国二等奖" value="'+UI.esc(h?.title||'')+'"><span class="field-error"></span></div>'+
'<div class="form-field full"><label for="honor-people">人员<span class="required">*</span></label><input id="honor-people" name="people" maxlength="200" placeholder="填写姓名，多人可用顿号分隔" value="'+UI.esc(h?.people||'')+'"><span class="help">直接填写展示文本，无需关联成员档案。</span><span class="field-error"></span></div>'+
'<div class="form-field full"><label>图片<span class="required">*</span><span class="help" style="float:right" id="photo-count"></span></label><input type="file" id="honor-files" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden><label class="upload-drop" id="upload-drop" for="honor-files">'+UI.icon('download')+'<strong>点击选择图片，或拖拽到此处</strong><small>JPG、PNG、WebP、GIF · 单张不超过 10 MB</small></label><div class="photo-grid" id="photo-grid"></div><div class="upload-line"><span class="help">至少 1 张，最多 9 张；拖动图片可调整顺序。</span><button type="button" id="sample-photo">使用示例图片</button></div><span class="field-error" id="photo-error"></span></div></div>'+
'<div class="note" style="margin-top:25px">第一张图片作为列表封面。本原型只在本机预览与保存图片，不会上传至线上图床。</div></form>',
footer:'<span class="foot-note">标题、人员、图片均为必填项</span><button class="btn" data-close>取消</button><button class="btn primary" id="honor-save" type="submit" form="honor-edit">'+(h?'保存修改':'创建荣誉')+'</button>'});
const f=d.querySelector('form');
function photos(){
d.querySelector('#photo-count').textContent=images.length+' / 9 张';
d.querySelector('#photo-grid').innerHTML=images.map((src,i)=>'<div class="photo-tile" draggable="true" data-index="'+i+'"><img src="'+UI.esc(src)+'" alt="已选择图片 '+(i+1)+'" data-zoom="'+i+'">'+(i===0?'<span class="cover-tag">封面</span>':'')+'<button class="remove-photo" type="button" data-remove="'+i+'" aria-label="删除第 '+(i+1)+' 张图片">×</button><div class="photo-tools"><span>第 '+(i+1)+' 张</span><div><button type="button" data-move="'+i+'" data-step="-1" aria-label="前移第 '+(i+1)+' 张图片" '+(i===0?'disabled':'')+'>←</button><button type="button" data-move="'+i+'" data-step="1" aria-label="后移第 '+(i+1)+' 张图片" '+(i===images.length-1?'disabled':'')+'>→</button></div></div></div>').join('');
d.querySelector('#sample-photo').disabled=images.length>=9||uploading;
}
const dirty=()=>d.dataset.dirty='true';
function move(from,to){if(from===to||to<0||to>=images.length)return;const [src]=images.splice(from,1);images.splice(to,0,src);dirty();photos()}
const grid=d.querySelector('#photo-grid');
grid.onclick=e=>{const remove=e.target.closest('[data-remove]'),moveButton=e.target.closest('[data-move]'),zoom=e.target.closest('[data-zoom]');if(remove){images.splice(Number(remove.dataset.remove),1);dirty();photos()}else if(moveButton)move(Number(moveButton.dataset.move),Number(moveButton.dataset.move)+Number(moveButton.dataset.step));else if(zoom)UI.zoom(images[Number(zoom.dataset.zoom)],'荣誉图片')};
grid.ondragstart=e=>{const tile=e.target.closest('[data-index]');if(!tile)return;dragIndex=Number(tile.dataset.index);e.dataTransfer.setData('text/plain',String(dragIndex));e.dataTransfer.effectAllowed='move'};
grid.ondragover=e=>{if(dragIndex===null)return;e.preventDefault();e.target.closest('.photo-tile')?.classList.add('drag-over')};
grid.ondragleave=e=>e.target.closest('.photo-tile')?.classList.remove('drag-over');
grid.ondrop=e=>{e.preventDefault();const target=e.target.closest('[data-index]');if(target&&dragIndex!==null)move(dragIndex,Number(target.dataset.index));dragIndex=null;grid.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'))};
grid.ondragend=()=>{dragIndex=null;grid.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'))};
const drop=d.querySelector('#upload-drop'),input=d.querySelector('#honor-files');
drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag-over')};drop.ondragleave=()=>drop.classList.remove('drag-over');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag-over');addFiles([...e.dataTransfer.files])};input.onchange=()=>{addFiles([...input.files]);input.value=''};
function resize(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(url);if(img.naturalWidth*img.naturalHeight>25000000){reject(new Error('图片像素超过 2500 万，请压缩后重试'));return}const scale=Math.min(1,1200/img.width,900/img.height),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.78))};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('无法读取图片，请选择有效图片文件'))};img.src=url})}
async function addFiles(files){
if(uploading||!files.length)return;
if(images.length+files.length>9){UI.toast('最多选择 9 张图片，请减少本次选择数量');return}
if(files.some(file=>!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))){UI.toast('仅支持 JPG、PNG、WebP 和 GIF 图片');return}
if(files.some(file=>file.size>10485760)){UI.toast('单张图片不能超过 10 MB');return}
uploading=true;d.querySelector('#honor-save').disabled=true;input.disabled=true;photos();
try{const loaded=await Promise.all(files.map(resize));images.push(...loaded);dirty();d.querySelector('#photo-error').textContent='';UI.toast('图片已添加至本地预览')}catch(e){UI.toast(e.message)}finally{uploading=false;d.querySelector('#honor-save').disabled=false;input.disabled=false;photos()}
}
d.querySelector('#sample-photo').onclick=()=>{if(images.length>=9)return;images.push(['assets/honor-certificate.svg','assets/honor-team.svg','assets/honor-innovation.svg'][images.length%3]);dirty();photos();d.querySelector('#photo-error').textContent=''};
f.addEventListener('input',e=>{dirty();const field=e.target.closest('.form-field');if(field?.classList.contains('invalid')){field.classList.remove('invalid');field.querySelector('.field-error').textContent=''}});
f.onsubmit=e=>{e.preventDefault();if(uploading)return;UI.clearErrors(f);let valid=true;const title=f.elements.title.value.trim(),people=f.elements.people.value.trim();
if(!title){UI.error(f.elements.title,'请填写荣誉标题');valid=false}
if(!people){UI.error(f.elements.people,'请填写人员');valid=false}
if(images.length<1||images.length>9){d.querySelector('#photo-error').textContent='请选择 1～9 张图片';valid=false}
if(!valid)return;
const record={id:h?.id||'h-'+(crypto.randomUUID?.()||Date.now()),title,people,images,version:h?h.version+((title!==h.title||people!==h.people||JSON.stringify(images)!==JSON.stringify(h.images))?1:0):1,updated:Demo.now()};
try{Demo.saveHonor(record);d.dataset.dirty='false';d.close();page=1;render();UI.toast(h?'荣誉已更新':'荣誉已创建')}catch(e){UI.toast(e.message)}
};photos();
}
$('new-honor').onclick=()=>editor();
$('honor-size').onchange=()=>{page=1;render()};
$('honor-pages').onclick=e=>{const b=e.target.closest('[data-page]');if(b&&!b.disabled){page=Number(b.dataset.page);render()}};
$('honor-rows').onclick=e=>{const v=e.target.closest('[data-view]'),edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(v)view(v.dataset.view);if(edit)editor(edit.dataset.edit);if(del)remove(del.dataset.delete)};
$('refresh-honors').onclick=()=>{render();UI.toast('演示列表已刷新')};
document.querySelector('.exit').onclick=()=>UI.ask('退出登录？','本次为静态原型，仅演示退出确认，不会退出真实 SSO 账户。','确认退出',()=>UI.toast('退出确认已演示'));
render();
})();
