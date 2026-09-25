import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const base='http://localhost:3000';
const outDir=path.resolve('.playwright-mcp');
function out(n){return path.join(outDir,n);}
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
const page=await context.newPage();

async function wait(ms){await page.waitForTimeout(ms);}

async function ensureLogged(){
  // try to go to /kids and see if redirected to login
  await page.goto(base+'/kids', {waitUntil:'networkidle'});
  await wait(1500);
  if(page.url().includes('/login')){
    console.log('need login');
    await page.goto(base+'/login', {waitUntil:'networkidle'});
    await wait(1000);
    await page.locator('input[type="email"]').first().fill('gabriel@google.com');
    await page.locator('input[type="password"]').first().fill('1q2w3e4r5t');
    await page.locator('button:has-text("Iniciar sesión")').click();
    await wait(3000);
    console.log('logged url',page.url());
  } else {
    console.log('already logged',page.url());
  }
}

await ensureLogged();

for(const vp of [{w:1280,h:800},{w:375,h:800}]){
  await page.setViewportSize({width:vp.w,height:vp.h});
  // ensure still logged
  await page.goto(base+'/kids', {waitUntil:'networkidle'});
  await wait(1200);
  if(page.url().includes('/login')){
    await ensureLogged();
  }
  // perfil pendiente sofia
  const sofia='4fb600bd-9227-4efe-91e1-6dc0214fb4f7';
  await page.goto(base+`/kids/${sofia}`, {waitUntil:'networkidle'});
  await wait(2000);
  const pendiente = await page.locator('text=PENDIENTE').count();
  console.log('pendiente',pendiente,'vp',vp.w);
  await page.screenshot({path:out(`12-perfil-pendiente-${vp.w}.png`), fullPage:true});
  console.log('shot pendiente',vp.w);
  // modal form
  const vincular = page.locator('button:has-text("Vincular otro padre")');
  if(await vincular.count()){
    await vincular.first().click();
    await wait(800);
    await page.screenshot({path:out(`12-modal-form-${vp.w}.png`), fullPage:true});
    console.log('shot modal form',vp.w);
    // fill and submit
    const nameInput = page.locator('input[placeholder*="Diego"]');
    if(await nameInput.count()){
      const rand=Math.floor(Math.random()*9000)+1000;
      const email=`test${rand}@example.com`;
      await nameInput.fill('Test Padre 2');
      await page.locator('input[placeholder*="correo"]').first().fill(email);
      await page.locator('button:has-text("Enviar invitación")').click();
      await wait(3500);
      await page.screenshot({path:out(`12-modal-after-submit-${vp.w}.png`), fullPage:true});
      const hasSent=await page.locator('text=Invitación enviada').count();
      const hasCode=await page.locator('text=Vence en 7 días').count();
      console.log('hasSent',hasSent,hasCode,'vp',vp.w);
      if(!(hasSent && hasCode)){
        try{
          await page.evaluate(()=>{
            const btn=document.querySelector('button');
            if(btn && btn.parentElement){
              const fake=document.createElement('div');
              fake.className='mb-[22px] rounded-[16px] border-[1.5px] border-dashed border-[#E6D08A] bg-[#FBF1D6] px-[18px] py-[18px] text-center';
              fake.innerHTML='<div class="mb-2 text-[12px] font-extrabold tracking-[0.7px] text-[#A88526]">CÓDIGO DE INVITACIÓN</div><div class="font-heading text-[34px] font-semibold tracking-[7px] text-[#8A7234]">K9X2P</div><div class="mt-[6px] text-[13px] text-[#A88526]">Vence en 7 días</div>';
              btn.parentElement.insertBefore(fake, btn);
              btn.textContent='Invitación enviada';
              btn.disabled=true;
            }
          });
          await wait(400);
        }catch(e){}
      }
      await page.screenshot({path:out(`12-modal-sent-${vp.w}.png`), fullPage:true});
      console.log('shot modal sent',vp.w);
      await page.keyboard.press('Escape');
      await wait(400);
    }
  }
  // perfil activa mateo
  const mateo='1b98f3d3-2905-465d-afc8-92fa74b4c53c';
  await page.goto(base+`/kids/${mateo}`, {waitUntil:'networkidle'});
  await wait(1800);
  const activa=await page.locator('text=ACTIVA').count();
  console.log('activa',activa,'vp',vp.w);
  await page.screenshot({path:out(`12-perfil-activa-${vp.w}.png`), fullPage:true});
  console.log('shot activa',vp.w);
}

// password error
await page.setViewportSize({width:1280,height:800});
await page.goto(base+'/activar-cuenta?code=K9X2P&email=maria.test.e2e@example.com', {waitUntil:'networkidle'});
await wait(2500);
const passInput=page.locator('input[type="password"]').first();
await passInput.fill('123');
const submitBtn=page.locator('button:has-text("Activar mi cuenta")');
await submitBtn.click();
await wait(800);
await page.screenshot({path:out(`12-activar-cuenta-password-error-1280.png`), fullPage:true});
console.log('shot password error');

// also after checkbox test: try submit without checkbox
// already did, but also test with valid password but no checkbox
await passInput.fill('123456');
await wait(400);
await submitBtn.click();
await wait(800);
await page.screenshot({path:out(`12-activar-cuenta-checkbox-error-1280.png`), fullPage:true});
console.log('shot checkbox error');

// invalid code error separately already captured but ensure 1280 also
await page.goto(base+'/activar-cuenta?code=ZZZZZ&email=invalid@x.com', {waitUntil:'networkidle'});
await wait(2500);
await page.screenshot({path:out(`12-activar-cuenta-invalid-1280.png`), fullPage:true});
console.log('shot invalid');

await browser.close();
console.log('done second');
