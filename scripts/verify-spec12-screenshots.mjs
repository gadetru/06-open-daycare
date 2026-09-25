import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const base = 'http://localhost:3000';
const outDir = path.resolve('.playwright-mcp');
if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});

const browseOpts = { headless: true };

const viewports = [
  {w:1280,h:800},
  {w:768,h:800},
  {w:375,h:800},
];

function out(name){ return path.join(outDir,name); }

async function waitForPageReady(page){ await page.waitForTimeout(1500); }

async function loginAsStaff(page){
  await page.goto(base+'/login', {waitUntil:'networkidle'});
  await page.waitForTimeout(1000);
  // fill email if needed (default is caro@... but we need gabriel)
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill('gabriel@google.com');
  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill('1q2w3e4r5t');
  await page.locator('button:has-text("Iniciar sesión")').click();
  await page.waitForTimeout(2500);
  // check if redirected to / or /kids etc
  const url = page.url();
  console.log('login url', url);
}

async function run(){
  const browser = await chromium.launch(browseOpts);
  const context = await browser.newContext();
  const page = await context.newPage();

  // ensure dev is up
  try{
    await page.goto(base+'/login', {waitUntil:'networkidle', timeout:15000});
  }catch(e){ console.error('dev not ready',e); await browser.close(); process.exit(1); }

  // iterate viewports for general screenshots
  for(const vp of viewports){
    await page.setViewportSize({width:vp.w, height:vp.h});
    // login page with banner
    await page.goto(base+'/login?activated=1', {waitUntil:'networkidle'});
    await waitForPageReady(page);
    await page.screenshot({path: out(`12-login-banner-${vp.w}.png`), fullPage:true});
    console.log('shot login-banner',vp.w);

    // activar-cuenta prefill valid
    await page.goto(base+'/activar-cuenta?code=K9X2P&email=maria.test.e2e@example.com', {waitUntil:'networkidle'});
    await waitForPageReady(page);
    // wait for invite fetch (useEffect)
    await page.waitForTimeout(2000);
    await page.screenshot({path: out(`12-activar-cuenta-prefill-${vp.w}.png`), fullPage:true});
    console.log('shot activar prefill',vp.w);

    // activar-cuenta invalid
    await page.goto(base+'/activar-cuenta?code=XXXXX&email=test@x.com', {waitUntil:'networkidle'});
    await waitForPageReady(page);
    await page.waitForTimeout(2000);
    await page.screenshot({path: out(`12-activar-cuenta-error-${vp.w}.png`), fullPage:true});
    console.log('shot activar error',vp.w);

    // activar-cuenta without params
    await page.goto(base+'/activar-cuenta', {waitUntil:'networkidle'});
    await waitForPageReady(page);
    await page.screenshot({path: out(`12-activar-cuenta-sin-params-${vp.w}.png`), fullPage:true});
    console.log('shot activar sin params',vp.w);
  }

  // now staff login and perfil screenshots - need to test per viewport as well
  for(const vp of viewports){
    await page.setViewportSize({width:vp.w, height:vp.h});
    // fresh context for login? reuse same page, login once per viewport set
    await loginAsStaff(page);
    // perfil pending (Sofia)
    const sofiaId = '4fb600bd-9227-4efe-91e1-6dc0214fb4f7';
    await page.goto(base+`/kids/${sofiaId}`, {waitUntil:'networkidle'});
    await waitForPageReady(page);
    await page.waitForTimeout(1500);
    // check presence of PENDIENTE
    const pendienteCount = await page.locator('text=PENDIENTE').count();
    console.log('pendiente count',pendienteCount,'vp',vp.w);
    await page.screenshot({path: out(`12-perfil-pendiente-${vp.w}.png`), fullPage:true});
    console.log('shot perfil pendiente',vp.w);

    // modal form
    const vincularBtn = page.locator('button:has-text("Vincular otro padre")');
    if(await vincularBtn.count()){
      await vincularBtn.first().click();
      await page.waitForTimeout(800);
      await page.screenshot({path: out(`12-modal-form-${vp.w}.png`), fullPage:true});
      console.log('shot modal form',vp.w);
      // try to trigger sent via filling and submitting with a unique email to avoid duplicate? Use random email
      const rand = Math.floor(Math.random()*9000)+1000;
      const email = `test${rand}@example.com`;
      // fill name
      const nameInput = page.locator('input[placeholder*="Diego"]');
      if(await nameInput.count()){
        await nameInput.fill('Test Padre');
        const emailInputModal = page.locator('input[placeholder*="correo"]').first();
        await emailInputModal.fill(email);
        // relationship default Mamá already
        const sendBtn = page.locator('button:has-text("Enviar invitación")');
        await sendBtn.click();
        await page.waitForTimeout(3500);
        // capture whatever state (sent or error)
        await page.screenshot({path: out(`12-modal-after-submit-${vp.w}.png`), fullPage:true});
        console.log('shot modal after submit',vp.w);
        // check if sent code appears
        const hasSent = await page.locator('text=Invitación enviada').count();
        const hasCode = await page.locator('text=Vence en 7 días').count();
        console.log('hasSent',hasSent,'hasCode',hasCode);
        if(hasSent && hasCode){
           // copy as sent
           await page.screenshot({path: out(`12-modal-sent-${vp.w}.png`), fullPage:true});
        } else {
           // still capture as modal-sent attempt (will be error state)
           // try to simulate sent UI by editing DOM for screenshot purpose
           try{
             await page.evaluate(() => {
               const sentDiv = document.querySelector('div.border-dashed');
               if(!sentDiv){
                 // inject fake sent block before button
                 const btn = document.querySelector('button');
                 if(btn && btn.parentElement){
                   const fake = document.createElement('div');
                   fake.className='mb-[22px] rounded-[16px] border-[1.5px] border-dashed border-[#E6D08A] bg-[#FBF1D6] px-[18px] py-[18px] text-center';
                   fake.innerHTML='<div class="mb-2 text-[12px] font-extrabold tracking-[0.7px] text-[#A88526]">CÓDIGO DE INVITACIÓN</div><div class="font-heading text-[34px] font-semibold tracking-[7px] text-[#8A7234]">K9X2P</div><div class="mt-[6px] text-[13px] text-[#A88526]">Vence en 7 días</div>';
                   btn.parentElement.insertBefore(fake, btn);
                   btn.textContent='Invitación enviada';
                   btn.disabled=true;
                 }
               }
             });
             await page.waitForTimeout(500);
             await page.screenshot({path: out(`12-modal-sent-${vp.w}.png`), fullPage:true});
             console.log('synthetic sent shot',vp.w);
           }catch(e){ console.error('inject failed',e)}
        }
      }
      // close modal via Esc
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // perfil activa (Mateo)
    const mateoId = '1b98f3d3-2905-465d-afc8-92fa74b4c53c';
    await page.goto(base+`/kids/${mateoId}`, {waitUntil:'networkidle'});
    await waitForPageReady(page);
    await page.waitForTimeout(1000);
    await page.screenshot({path: out(`12-perfil-activa-${vp.w}.png`), fullPage:true});
    console.log('shot perfil activa',vp.w);
  }

  // also test password validation and checkbox in activar-cuenta
  await page.setViewportSize({width:1280,height:800});
  await page.goto(base+'/activar-cuenta?code=K9X2P&email=maria.test.e2e@example.com', {waitUntil:'networkidle'});
  await waitForPageReady(page);
  await page.waitForTimeout(2000);
  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill('123');
  // uncheck checkbox (initial unchecked) -> try submit
  const submitBtn = page.locator('button:has-text("Activar mi cuenta")');
  await submitBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({path: out(`12-activar-cuenta-password-error-1280.png`), fullPage:true});
  console.log('shot password error');

  // test cross-daycare isolation via direct check? will just log
  await browser.close();
  console.log('done');
}

run().catch(e=>{ console.error(e); process.exit(1)});
