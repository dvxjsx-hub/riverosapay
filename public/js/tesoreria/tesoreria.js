/* ============================================================
   Riverosapay · TESORERÍA
   TANDA 2: BOSS administra tesoreros; empleado administra capital.
   ============================================================ */
function dineroCO(n){ return '$' + Number(n||0).toLocaleString('es-CO'); }
function iconoDinero(){ return '<span style="font-size:22px;line-height:1;">💰</span>'; }

async function abrirTesorero(){
  closeDrawer();
  if(modoActualUsuario()!=='jefe') return;
  STATE.viewMode='jefe-tesoreria'; $('#tabbar').classList.add('hidden');
  $('#content').innerHTML='<div class="empty-card"><div class="empty-icon">💰</div><h2>TESORERO</h2><p class="muted">Cargando tus tesoreros…</p></div>';
  try{ await cargarTesoreroJefe(); }catch(ex){ toast(ex.message); }
}

async function cargarTesoreroJefe(){
  const data=await api.get(`/api/tesoreria/jefe/${STATE.user.id}/tesoreros`); const lista=data.tesoreros||[];
  const cards=lista.map(t=>`<button class="historial-card" type="button" onclick="abrirDetalleTesorero('${escapeHtml(t.id)}')"><span class="historial-avatar">${escapeHtml((t.tesoreroNombre||t.tesoreroUsername||'?').slice(0,1).toUpperCase())}</span><span class="historial-info"><div class="historial-nombre">${escapeHtml(t.tesoreroNombre||t.tesoreroUsername)}</div><div class="historial-fecha">Capital disponible · <b>${dineroCO(t.saldo)}</b></div></span></button>`).join('');
  $('#content').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;"><div><div class="empty-tag">GESTIÓN</div><h2 style="margin:2px 0 0;font-family:var(--font-display);color:var(--green-900);">Mis tesoreros</h2></div><button class="trabajo-plus" style="width:56px;height:56px;border-radius:50%;border:none;background:var(--green-700);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);cursor:pointer;" type="button" onclick="abrirAgregarTesorero()" aria-label="Añadir tesorero">${ICONS.plus}</button></div>${cards||emptyCardHTML('TESORERO','Aún no tienes tesoreros. Usa + para enviar una solicitud a una amistad.','historial')}`;
}

async function abrirAgregarTesorero(){
  let amistades=[]; try{ const d=await api.get(`/api/amistades/${STATE.user.id}`); amistades=d.amistades||[]; }catch(ex){toast(ex.message);return;}
  if(!amistades.length){openModal('Añadir tesorero','<p class="muted">Primero necesitas tener una amistad.</p>');return;}
  const opciones=amistades.map(a=>`<option value="${escapeHtml(a.id)}">${escapeHtml(a.nombreCompleto||a.username)}</option>`).join('');
  openModal('Añadir tesorero',`<p class="muted" style="margin-top:0;">Selecciona la amistad que quieres invitar como tu tesorero.</p><label>Amistad<select id="f-tesorero-amigo">${opciones}</select></label><p class="field-error" id="f-tesorero-error"></p><button class="btn-primary" id="f-tesorero-btn" type="button" onclick="enviarSolicitudTesorero()">Enviar solicitud</button>`);
}
async function enviarSolicitudTesorero(){
  const tesoreroId=$('#f-tesorero-amigo')?.value,err=$('#f-tesorero-error'),btn=$('#f-tesorero-btn'); if(!tesoreroId)return; btn.disabled=true; err.textContent='';
  try{await api.post(`/api/tesoreria/jefe/${STATE.user.id}/tesoreros/solicitudes`,{tesoreroId});closeModal();toast('Solicitud de tesorero enviada.');}catch(ex){btn.disabled=false;err.textContent=ex.message;}
}
async function abrirDetalleTesorero(relacionId){
  try{const d=await api.get(`/api/tesoreria/jefe/${STATE.user.id}/tesoreros/${relacionId}/movimientos`);const r=d.relacion;const mov=d.movimientos||[];const rows=mov.length?mov.map(m=>`<div class="tes-mov ${m.tipo==='gasto'?'gasto':''}"><div><b>${m.tipo==='entrada'?'+':'−'} ${dineroCO(m.cantidad)}</b><div class="muted">${escapeHtml(m.descripcion)}</div></div><span>${formatFecha(m.fecha)}</span></div>`).join(''):'<p class="muted">Aún no hay movimientos.</p>';openModal(r.tesoreroNombre||r.tesoreroUsername,`<div class="tes-balance"><span>Capital disponible</span><strong>${dineroCO(r.saldo)}</strong></div><button class="btn-primary" type="button" onclick="abrirAgregarCapital('${escapeHtml(r.id)}')">Añadir capital</button><div><h4 style="margin:4px 0 10px;color:var(--green-900);">Movimientos</h4>${rows}</div>`);}catch(ex){toast(ex.message);}
}
async function abrirAgregarCapital(relacionId){
  openModal('Añadir capital',`<p class="muted" style="margin-top:0;">El capital se sumará al saldo del tesorero y quedará registrado en su historial.</p><label>Cantidad<input id="f-capital-cantidad" type="number" min="1" step="1" inputmode="numeric" placeholder="200000"></label><label>Descripción<textarea id="f-capital-desc" placeholder="Ej. Capital semanal"></textarea></label><p class="field-error" id="f-capital-error"></p><button class="btn-primary" id="f-capital-btn" type="button" onclick="guardarCapital('${escapeHtml(relacionId)}')">Añadir capital</button>`);
}
async function guardarCapital(relacionId){const c=Number($('#f-capital-cantidad')?.value),d=$('#f-capital-desc')?.value.trim(),err=$('#f-capital-error'),btn=$('#f-capital-btn');if(!Number.isInteger(c)||c<=0){err.textContent='Ingresa una cantidad válida.';return;}if(!d){err.textContent='Escribe una descripción.';return;}btn.disabled=true;try{await api.post(`/api/tesoreria/jefe/${STATE.user.id}/tesoreros/${relacionId}/capital`,{cantidad:c,descripcion:d});closeModal();toast('Capital añadido correctamente.');await cargarTesoreroJefe();}catch(ex){btn.disabled=false;err.textContent=ex.message;}}

async function abrirAdministrarCapital(){
  closeDrawer(); if(modoActualUsuario()!=='empleado')return; STATE.viewMode='empleado-capital'; $('#tabbar').classList.add('hidden');
  $('#content').innerHTML='<div class="empty-card"><div class="empty-icon">💰</div><h2>CAPITAL</h2><p class="muted">Cargando…</p></div>';
  try{await cargarCapitalEmpleado();}catch(ex){toast(ex.message);}
}
async function cargarCapitalEmpleado(){
  const d=await api.get(`/api/tesoreria/tesorero/${STATE.user.id}/relaciones`),rels=d.relaciones||[];
  if(!rels.length){$('#content').innerHTML=emptyCardHTML('ADMINISTRAR CAPITAL','Todavía no tienes una relación de tesorería aceptada por un BOSS.','historial');return;}
  const cards=rels.map(r=>`<button class="historial-card" type="button" onclick="abrirCapitalRelacion('${escapeHtml(r.jefeId)}')"><span class="historial-avatar">${escapeHtml((r.jefeNombre||r.jefeUsername||'?').slice(0,1).toUpperCase())}</span><span class="historial-info"><div class="historial-nombre">${escapeHtml(r.jefeNombre||r.jefeUsername)}</div><div class="historial-fecha">Capital disponible · <b>${dineroCO(r.saldo)}</b></div></span></button>`).join('');
  $('#content').innerHTML=`<div><div class="empty-tag">TESORERÍA</div><h2 style="margin:2px 0 0;font-family:var(--font-display);color:var(--green-900);">Administrar capital</h2><p class="muted" style="margin:4px 0 0;font-size:12px;">Selecciona el BOSS para administrar su capital.</p></div>${cards}`;
}
async function abrirCapitalRelacion(jefeId){
  try{const d=await api.get(`/api/tesoreria/tesorero/${STATE.user.id}/movimientos?jefeId=${encodeURIComponent(jefeId)}`),r=d.relacion,m=d.movimientos||[];const rows=m.length?m.map(x=>`<div class="tes-mov ${x.tipo==='gasto'?'gasto':''}"><div><b>${x.tipo==='entrada'?'+':'−'} ${dineroCO(x.cantidad)}</b><div class="muted">${escapeHtml(x.descripcion)}</div></div><span>${formatFecha(x.fecha)}</span></div>`).join(''):'<p class="muted">Aún no hay movimientos.</p>';openModal(r.jefeNombre||r.jefeUsername,`<div class="tes-balance"><span>Capital disponible</span><strong>${dineroCO(r.saldo)}</strong></div><button class="btn-primary" type="button" onclick="abrirGasto('${escapeHtml(r.jefeId)}')">Registrar gasto</button><div><h4 style="margin:4px 0 10px;color:var(--green-900);">Movimientos</h4>${rows}</div>`);}catch(ex){toast(ex.message);}
}
async function abrirGasto(jefeId){openModal('Registrar gasto',`<p class="muted" style="margin-top:0;">El gasto se descontará del capital disponible y quedará registrado.</p><label>Cantidad<input id="f-gasto-cantidad" type="number" min="1" step="1" inputmode="numeric" placeholder="75000"></label><label>Descripción<textarea id="f-gasto-desc" placeholder="Ej. Compra de materiales"></textarea></label><p class="field-error" id="f-gasto-error"></p><button class="btn-primary" id="f-gasto-btn" type="button" onclick="guardarGasto('${escapeHtml(jefeId)}')">Registrar gasto</button>`);}
async function guardarGasto(jefeId){const c=Number($('#f-gasto-cantidad')?.value),d=$('#f-gasto-desc')?.value.trim(),err=$('#f-gasto-error'),btn=$('#f-gasto-btn');if(!Number.isInteger(c)||c<=0){err.textContent='Ingresa una cantidad válida.';return;}if(!d){err.textContent='Escribe en qué gastaste el capital.';return;}btn.disabled=true;try{await api.post('/api/tesoreria/tesorero/gastos',{jefeId,cantidad:c,descripcion:d});closeModal();toast('Gasto registrado.');await cargarCapitalEmpleado();}catch(ex){btn.disabled=false;err.textContent=ex.message;}}
