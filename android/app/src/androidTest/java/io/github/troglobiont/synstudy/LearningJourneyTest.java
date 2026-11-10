package io.github.troglobiont.synstudy;

import static org.junit.Assert.*;
import android.content.pm.PackageManager;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiObject;
import androidx.test.uiautomator.UiSelector;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class LearningJourneyTest {
    private ActivityScenario<MainActivity> scenario;
    private Object js(String code) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>("null");
        scenario.onActivity(a -> a.getLearningView().evaluateJavascript(code,value -> {
            result.set(value);done.countDown();
        }));
        assertTrue("WebView callback timed out",done.await(5,TimeUnit.SECONDS));
        return new JSONTokener(result.get()).nextValue();
    }
    private void await(String expression) throws Exception {
        long deadline = SystemClock.uptimeMillis()+20000;
        while(SystemClock.uptimeMillis()<deadline) {
            if(Boolean.TRUE.equals(js(expression))) return;
            SystemClock.sleep(100);
        }
        fail("UI condition timed out: "+expression+"; URL="+js("location.href"));
    }
    private void click(String selector) throws Exception {
        assertEquals("Missing control "+selector,Boolean.TRUE,js("(function(){var e=document.querySelector("+
            JSONObject.quote(selector)+");if(!e)return false;e.click();return true;})()"));
    }
    private void route(String hash) throws Exception {
        js("location.hash="+JSONObject.quote(hash));
        await("location.hash==="+JSONObject.quote(hash));
        SystemClock.sleep(150);
    }
    private void choose(String part,String value) throws Exception {
        click("[data-part='"+part+"'][value='"+value+"']");
    }
    private void type(String part,String value) throws Exception {
        js("(function(){var e=document.querySelector('#field-"+part+"');e.value="+JSONObject.quote(value)+
            ";e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()");
    }
    private void submitPractice(String id) throws Exception {
        await("document.querySelector('#answer-form')?.dataset.question==="+JSONObject.quote(id));
        js("document.querySelector('#answer-form').requestSubmit()");
        await("!!document.querySelector('.feedback.success')");
    }
    private void nextPractice(boolean last) throws Exception {
        click("[data-action='next-question']");
        if(last)await("!!document.querySelector('.insight-sheet')");
    }
    private void allCorrectPractice(String chapter) throws Exception {
        route("#lesson/"+chapter+"/practice");
        for(int i=1;i<=5;i++) {
            String id="l"+(chapter.equals("one")?"1":"2")+"-"+i;
            await("document.querySelector('#answer-form')?.dataset.question==="+JSONObject.quote(id));
            if(id.equals("l1-1")) { choose("a","0");choose("a","1"); }
            else if(id.equals("l1-3")) { type("a","-7,0");choose("b","0"); }
            else if(id.equals("l1-5")) { choose("a","0");type("b","0/2"); }
            else if(id.equals("l2-1")) { choose("a","0");choose("b","0");choose("b","1"); }
            else if(id.equals("l2-5")) { type("a","{3;2;0;-1}");choose("b","0"); }
            else choose("a","0");
            submitPractice(id);nextPractice(i==5);
        }
        click("[data-action='collect']");
        await("document.querySelector('[data-action=collect]').textContent.includes('в вашем атласе')");
    }
    @Test public void completeOfflineJourneyAndNativeFiles() throws Exception {
        scenario=ActivityScenario.launch(MainActivity.class);
        try {
            await("document.querySelector('.brand')!==null");
            assertEquals(PackageManager.PERMISSION_DENIED,
                InstrumentationRegistry.getInstrumentation().getTargetContext().checkSelfPermission("android.permission.INTERNET"));
            assertEquals("function",js("typeof SynAndroid.saveJson"));
            assertEquals(Boolean.TRUE,js("location.origin==='https://appassets.androidplatform.net'"));
            assertEquals(Boolean.TRUE,js("document.documentElement.scrollWidth<=innerWidth"));

            // A real wrong first answer, empty input and answer reveal cannot become independent success.
            route("#lesson/one/practice");
            await("document.querySelector('#answer-form')?.dataset.question==='l1-1'");
            js("document.querySelector('#answer-form').requestSubmit()");
            await("document.querySelector('#form-message').textContent.includes('Заполните')");
            choose("a","2");js("document.querySelector('#answer-form').requestSubmit()");
            await("!!document.querySelector('.feedback.neutral')");
            click("[data-action='hint']");click("[data-action='reveal']");
            choose("a","2"); // uncheck the wrong option
            allCorrectPractice("one");
            assertEquals(Boolean.TRUE,js("document.querySelector('.footer').textContent.includes('4 / 10 с первой')"));

            route("#lesson/two/lab");
            js("var p=document.querySelector('#map-preset');p.value='branch';p.dispatchEvent(new Event('change',{bubbles:true}))");
            await("document.querySelector('.lab-conclusion').textContent.includes('Биекция')");
            allCorrectPractice("two");
            assertEquals(Boolean.TRUE,js("document.querySelector('.footer').textContent.includes('9 / 10 с первой')"));

            scenario.recreate();
            await("!!document.querySelector('.insight-sheet')");
            assertEquals(Boolean.TRUE,js("document.querySelector('.insight-sheet').textContent.includes('5 / 5 решено')"));

            // Separate sandbox, including a native process/activity restart.
            route("#data");click("[data-action='begin-sandbox']");
            await("!!document.querySelector('.sandbox-banner')");
            scenario.recreate();await("!!document.querySelector('.sandbox-banner')");
            click("[data-action='end-sandbox']");
            await("!document.querySelector('.sandbox-banner')");
            assertEquals(Boolean.TRUE,js("document.querySelector('.footer').textContent.includes('9 / 10 с первой')"));

            route("#test");click("[data-action='start-test']");
            for(int i=1;i<=10;i++) {
                await("document.querySelector('#answer-form')?.dataset.question==='t-"+i+"'");
                if(i==1){choose("a","0");choose("a","1");}
                else if(i==8)type("a","{3,-3}");
                else choose("a","0");
                js("document.querySelector('#answer-form').requestSubmit()");
            }
            await("location.hash==='#test/overview'");
            click("[data-action='finish-test']");
            await("!!document.querySelector('.test-score')");
            assertEquals(Boolean.TRUE,js("document.querySelector('.test-score strong').textContent==='10 / 10'"));

            // Real Android document picker: export, reset, import the same JSON.
            route("#data");
            click("[data-action='export']");
            UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
            UiObject filename=device.findObject(new UiSelector().className("android.widget.EditText"));
            assertTrue("Save document picker",filename.waitForExists(10000));
            filename.setText("SYN-Study-device-test.json");
            UiObject save=device.findObject(new UiSelector().textMatches("(?i)save"));
            assertTrue("Save button",save.waitForExists(10000));save.click();
            await("document.querySelector('#toast').textContent==='Файл сохранён.'");
            click("[data-action='ask-reset']");click("[data-action='confirm-reset']");
            await("document.querySelector('.footer').textContent.includes('0 / 10 с первой')");
            js("document.querySelector('.file-label').scrollIntoView({block:'center'})");
            UiObject importControl=device.findObject(new UiSelector().text("Выбрать файл импорта"));
            assertTrue("Native import control",importControl.waitForExists(5000));importControl.click();
            UiObject exported=device.findObject(new UiSelector().text("SYN-Study-device-test.json"));
            if(!exported.waitForExists(5000)) {
                UiObject roots=device.findObject(new UiSelector().description("Show roots"));
                if(roots.exists())roots.click();
                UiObject downloads=device.findObject(new UiSelector().text("Downloads"));
                if(downloads.exists())downloads.click();
            }
            assertTrue("Exported JSON visible in picker",exported.waitForExists(10000));exported.click();
            await("!!document.querySelector('.import-preview')");
            click("[data-action='confirm-import']");
            await("document.querySelector('.footer').textContent.includes('9 / 10 с первой')");
            route("#results");
            assertEquals(Boolean.TRUE,js("document.querySelector('.test-score strong').textContent==='10 / 10'"));

            click("[data-action='glossary']");await("!!document.querySelector('dialog[open]')");
            device.pressBack();await("!document.querySelector('dialog[open]')");
            assertEquals("#results",js("location.hash"));
        } finally { scenario.close(); }
    }
}
