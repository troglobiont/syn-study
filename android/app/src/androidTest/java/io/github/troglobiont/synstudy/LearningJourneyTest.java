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
            int chapterNumber=java.util.Arrays.asList("one","two","three","four","five","six","real","sequences","limits","derivatives","numeric","indefinite","improper","space","continuity","higher","smooth","measure","lebesgue","multiple","parameters","uniformintegrals","approximation","surface","forms","fourier").indexOf(chapter)+1;
            String id="l"+chapterNumber+"-"+i;
            await("document.querySelector('#answer-form')?.dataset.question==="+JSONObject.quote(id));
            if(id.equals("l1-1")) { choose("a","0");choose("a","1"); }
            else if(id.equals("l1-3")) { type("a","-7,0");choose("b","0"); }
            else if(id.equals("l1-5")) { choose("a","0");type("b","0/2"); }
            else if(id.equals("l2-1")) { choose("a","0");choose("b","0");choose("b","1"); }
            else if(id.equals("l2-5")) { type("a","{3;2;0;-1}");choose("b","0"); }
            else if(id.equals("l3-2"))type("a","8");
            else if(id.equals("l3-4"))type("a","1");
            else if(id.equals("l3-5")){choose("a","0");choose("a","1");}
            else if(id.equals("l4-1")){type("a","4");type("b","13");}
            else if(id.equals("l4-2")||id.equals("l4-3"))type("a","2");
            else if(id.equals("l4-5"))type("a","-3/4");
            else if(id.equals("l5-2")){type("a","1/4");choose("b","0");}
            else if(id.equals("l5-3")){type("a","1");choose("b","0");}
            else if(id.equals("l5-5")){type("a","2");choose("b","0");}
            else if(id.equals("l6-1"))type("a","3");
            else if(id.equals("l6-2")){choose("a","0");type("b","4");}
            else if(id.equals("l6-3"))type("a","5");
            else if(id.equals("l6-4"))type("a","4");
            else if(id.equals("l6-5")){type("a","2");choose("b","0");}
            else if(chapterNumber>=16)yearTwoPractice(id);
            else if(chapterNumber>=7)foundationPractice(id);
            else choose("a","0");
            submitPractice(id);nextPractice(i==5);
        }
        click("[data-action='collect']");
        await("document.querySelector('[data-action=collect]').textContent.includes('Итоги сохранены')");
    }
    private void yearTwoPractice(String id) throws Exception {
        switch(id) {
            case "l16-1":type("a","6");break;
            case "l16-2":type("a","3");break;
            case "l16-5":type("a","0");break;
            case "l17-1":type("a","3");break;
            case "l18-1":type("a","0");break;
            case "l18-2":type("a","4");break;
            case "l19-1":type("a","1");break;
            case "l19-4":type("a","0");break;
            case "l20-1":type("a","1/2");break;
            case "l21-1":type("a","24");break;
            case "l21-2":type("a","1/12");break;
            case "l21-3":type("a","-1/4");break;
            case "l23-1":type("a","6");break;
            case "l23-2":type("a","1");break;
            case "l24-1":type("a","3");break;
            case "l24-2":type("a","5");break;
            case "l24-5":type("a","1");break;
            case "l25-1":type("a","-1");break;
            case "l26-1":type("a","1/2");break;
            case "l26-5":type("a","3");break;
            default:choose("a","0");
        }
    }
    private void yearTwoTest(int i) throws Exception {
        switch(i) {
            case 76:type("a","20");break;
            case 79:type("a","-1");break;
            case 81:type("a","3");break;
            case 86:type("a","0");break;
            case 87:type("a","3");break;
            case 91:type("a","0");break;
            case 96:type("a","6");break;
            case 101:type("a","6");break;
            case 102:type("a","1/2");break;
            case 103:type("a","-1");break;
            case 111:type("a","4");break;
            case 116:type("a","6");break;
            case 117:type("a","2");break;
            case 121:type("a","0");break;
            case 122:type("a","0");break;
            case 126:type("a","1");break;
            default:choose("a","0");
        }
    }
    private void foundationPractice(String id) throws Exception {
        switch(id) {
            case "l7-1":type("a","1");type("b","0");break;
            case "l7-2":type("a","3");choose("b","0");break;
            case "l7-3":choose("a","0");choose("a","1");choose("a","2");break;
            case "l7-4":type("a","201");break;
            case "l8-2":type("a","100");break;
            case "l8-3":type("a","1");type("b","-1");break;
            case "l9-1":type("a","3/2");type("b","5/2");break;
            case "l9-2":type("a","0.1");break;
            case "l9-3":type("a","2");break;
            case "l9-5":type("a","3");break;
            case "l10-1":type("a","4");break;
            case "l10-2":type("a","-1");type("b","1");break;
            case "l10-3":type("a","24");break;
            case "l10-5":type("a","-1/2");break;
            case "l11-1":type("a","2");break;
            case "l11-5":type("a","1");break;
            case "l12-4":type("a","1");type("b","-1");break;
            case "l13-1":type("a","1/3");break;
            case "l13-2":type("a","2");break;
            case "l14-1":type("a","5");type("b","4");break;
            case "l15-1":type("a","3");break;
            case "l15-4":type("a","3");type("b","-1");break;
            case "l15-5":type("a","5");break;
            default:choose("a","0");
        }
    }
    private void foundationTest(int i) throws Exception {
        switch(i) {
            case 31:type("a","5");choose("b","0");break;
            case 32:type("a","0");choose("b","0");break;
            case 35:type("a","1001");break;
            case 36:case 45:type("a","3");break;
            case 38:type("a","1");type("b","-1");break;
            case 41:case 54:type("a","0.1");break;
            case 42:case 71:type("a","4");break;
            case 46:type("a","12");break;
            case 47:type("a","0");break;
            case 49:type("a","-1/2");break;
            case 51:case 55:type("a","1/2");break;
            case 59:type("a","1");type("b","-1");break;
            case 61:type("a","1/8");break;
            case 66:type("a","5");break;
            case 72:type("a","1");break;
            case 73:type("a","-2");break;
            default:choose("a","0");
        }
    }
    private void exploreSeminarsAndProofs(UiDevice device) throws Exception {
        route("#task/s-sequences-1");
        await("document.querySelector('#answer-form')?.dataset.question==='s-sequences-1'");
        type("a","3/2");
        click("[data-action='guide'][data-panel='knowledge']");
        await("!!document.querySelector('.knowledge-list a')");
        click(".knowledge-list a");
        await("location.hash.includes('/meaning/topic-')");
        await("document.activeElement?.id?.startsWith('topic-')");
        click("[data-return-question='s-sequences-1']");
        await("document.querySelector('#field-a')?.value==='3/2'");
        click("[data-action='guide'][data-panel='example']");
        await("document.querySelectorAll('.help-section .step-reason').length>=3");
        click("[data-action='guide'][data-panel='solution']");
        await("document.querySelectorAll('.solution-panel .step-reason').length===4");
        // Reading is possible before any answer is submitted and creates no success.
        assertEquals(Boolean.TRUE,js("!document.querySelector('.feedback.success')"));
        submitPractice("s-sequences-1");
        click("[data-action='pin']");
        scenario.recreate();
        await("document.querySelector('#field-a')?.value==='3/2'");
        assertEquals(Boolean.TRUE,js("!!document.querySelector('.solution-panel')"));
        route("#review");
        assertEquals(Boolean.TRUE,js("document.body.textContent.includes('Сопряжённое выражение')"));

        route("#proof/bolzano-weierstrass");
        await("document.querySelectorAll('.proof-reader .step-reason').length===1");
        click("[data-action='proof-next']");
        await("document.querySelectorAll('.proof-reader .step-reason').length===2");
        scenario.recreate();
        await("document.querySelectorAll('.proof-reader .step-reason').length===2");
        click("[data-action='proof-all']");
        await("document.querySelectorAll('.proof-reader .step-reason').length===7");
        device.executeShellCommand("screencap -p /sdcard/Download/SYN-Study-proof.png");
        route("#lesson/sequences/meaning/topic-8");
        await("document.activeElement?.id==='topic-8'");
        assertEquals(Boolean.TRUE,js("!!document.querySelector('#topic-8 a[href=\"#proof/bolzano-weierstrass\"]')"));
        assertEquals(Boolean.TRUE,js("!document.querySelector('#topic-6 a[href=\"#proof/bolzano-weierstrass\"]')"));
        assertEquals(Boolean.TRUE,js("Boolean(document.querySelector('#topic-8').compareDocumentPosition(document.querySelector('#topic-7')) & Node.DOCUMENT_POSITION_FOLLOWING)"));

        route("#lesson/one/meaning/topic-9");
        await("document.activeElement?.id==='topic-9'");
        click("#topic-9 summary");
        click("#topic-9 a[href='#proof/cantor-power']");
        await("location.hash==='#proof/cantor-power' && !!document.querySelector('[data-reading-back]')");
        click(".proof-reader .panel summary");
        click(".proof-reader a[href='#lesson/one/meaning/topic-7']");
        await("document.activeElement?.id==='topic-7'");
        click("[data-reading-back]");
        await("location.hash==='#proof/cantor-power' && document.activeElement?.hash==='#lesson/one/meaning/topic-7'");
        click("[data-reading-back]");
        await("location.hash==='#lesson/one/meaning/topic-9' && document.activeElement?.hash==='#proof/cantor-power'");
        assertEquals(Boolean.TRUE,js("document.querySelector('#topic-9 details').open"));

        for(String chapter:new String[]{"one","two","real","sequences","limits","derivatives","numeric","indefinite","three","improper","space","continuity","four","five","higher","smooth","measure","lebesgue","multiple","parameters","uniformintegrals","approximation","surface","forms","six","fourier"}) {
            for(int n=1;n<=2;n++) {
                String id="s-"+chapter+"-"+n;
                route("#task/"+id);
                await("document.querySelector('#answer-form')?.dataset.question==="+JSONObject.quote(id));
                if(!Boolean.TRUE.equals(js("!!document.querySelector('.solution-panel')")))click("[data-action='guide'][data-panel='solution']");
                await("document.querySelectorAll('.solution-panel .step-reason').length>=4");
                assertEquals(Boolean.TRUE,js("document.documentElement.scrollWidth<=innerWidth"));
            }
        }
        route("#seminars");
        js("document.querySelector('.seminar-plan').open=true");
        click("[data-action='semester'][data-value='4']");
        await("document.querySelector('.semester-filter [aria-pressed=true]').textContent==='Семестр 4'");
        js("var s=document.querySelector('#seminar-search');s.value='Фурье';document.querySelector('#seminar-filter').requestSubmit()");
        await("document.querySelectorAll('#seminar-results .seminar-card').length===2");
        assertEquals(Boolean.TRUE,js("document.querySelector('#seminar-results').textContent.includes('2937')"));
    }
    @Test public void completeOfflineJourneyAndNativeFiles() throws Exception {
        scenario=ActivityScenario.launch(MainActivity.class);
        try {
            await("document.querySelector('.brand')!==null");
            UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
            // A cold emulator can show a launcher ANR over the app. Dismiss only that
            // unrelated system dialog; an ANR naming SYN remains a test failure.
            UiObject homeTitle=device.findObject(new UiSelector().textContains("Математический"));
            for(int pass=0;pass<6;pass++) {
                UiObject launcher=device.findObject(new UiSelector().textContains("Pixel Launcher"));
                if(launcher.exists()) {
                    UiObject closeLauncher=device.findObject(new UiSelector().text("Close app"));
                    if(closeLauncher.exists())closeLauncher.click();
                }
                if(homeTitle.waitForExists(5000))break;
            }
            assertTrue("Rendered home",homeTitle.exists());
            device.waitForIdle();
            device.executeShellCommand("screencap -p /sdcard/Download/SYN-Study-home.png");
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
            click("[data-action='guide'][data-panel='hint']");click("[data-action='guide'][data-panel='solution']");
            choose("a","2"); // uncheck the wrong option
            allCorrectPractice("one");
            assertEquals(Boolean.TRUE,js("document.querySelector('.footer').textContent.includes('4 / 130 с первой')"));

            route("#lesson/two/lab");
            js("var p=document.querySelector('#map-preset');p.value='branch';p.dispatchEvent(new Event('change',{bubbles:true}))");
            await("document.querySelector('.lab-conclusion').textContent.includes('Биекция')");
            allCorrectPractice("two");
            for(String chapter:new String[]{"three","four","five","six"}) {
                route("#lesson/"+chapter+"/lab");
                await("!!document.querySelector('#advanced-model-output svg')");
                js("var c=document.querySelector('[data-model-field]');c.value=c.max;c.dispatchEvent(new Event('input',{bubbles:true}))");
                assertEquals(Boolean.TRUE,js("document.documentElement.scrollWidth<=innerWidth"));
                allCorrectPractice(chapter);
            }
            for(String chapter:new String[]{"real","sequences","limits","derivatives","numeric","indefinite","improper","space","continuity"}) {
                route("#lesson/"+chapter+"/lab");
                await("document.querySelectorAll('.worked-example').length>=3");
                if(Boolean.TRUE.equals(js("!!document.querySelector('[data-foundation-field]')"))) {
                    js("var c=document.querySelector('[data-foundation-field]');if(c.type==='range'){c.value=c.max;c.dispatchEvent(new Event('input',{bubbles:true}))}");
                    await("!!document.querySelector('#foundation-model-output')");
                }
                assertEquals(Boolean.TRUE,js("document.documentElement.scrollWidth<=innerWidth"));
                allCorrectPractice(chapter);
            }
            for(String chapter:new String[]{"higher","smooth","measure","lebesgue","multiple","parameters","uniformintegrals","approximation","surface","forms","fourier"}) {
                route("#lesson/"+chapter+"/lab");
                await("document.querySelectorAll('.worked-example').length===3");
                if(Boolean.TRUE.equals(js("!!document.querySelector('[data-year-field]')"))) {
                    js("var c=document.querySelector('[data-year-field]');if(c.type==='range'){c.value=c.max}else{c.selectedIndex=c.options.length-1};c.dispatchEvent(new Event('input',{bubbles:true}))");
                    await("!!document.querySelector('#year-two-output .lab-conclusion')");
                }
                assertEquals(Boolean.TRUE,js("document.documentElement.scrollWidth<=innerWidth"));
                allCorrectPractice(chapter);
            }
            assertEquals(Boolean.TRUE,js("document.querySelector('.footer').textContent.includes('129 / 130 с первой')"));

            scenario.recreate();
            await("!!document.querySelector('.insight-sheet')");
            assertEquals(Boolean.TRUE,js("document.querySelector('.insight-sheet').textContent.includes('5 / 5 решено')"));

            // Separate sandbox, including a native process/activity restart.
            route("#data");click("[data-action='begin-sandbox']");
            await("!!document.querySelector('.sandbox-banner')");
            scenario.recreate();await("!!document.querySelector('.sandbox-banner')");
            click("[data-action='end-sandbox']");
            await("!document.querySelector('.sandbox-banner')");
            assertEquals(Boolean.TRUE,js("document.querySelector('.footer').textContent.includes('129 / 130 с первой')"));

            exploreSeminarsAndProofs(device);

            route("#test");click("[data-action='start-test']");
            for(int i:new int[]{1,2,3,4,5,6,7,8,9,10,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,11,12,13,14,15,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,16,17,18,19,20,21,22,23,24,25,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,26,27,28,29,30,126,127,128,129,130}) {
                await("document.querySelector('#answer-form')?.dataset.question==='t-"+i+"'");
                if(i==1){choose("a","0");choose("a","1");}
                else if(i==8)type("a","{3,-3}");
                else if(i==11||i==25||i==30)type("a","1");
                else if(i==13)type("a","1/2");
                else if(i==16)type("a","-1");
                else if(i==18)type("a","20");
                else if(i==23){type("a","1");choose("b","0");}
                else if(i==24)type("a","4");
                else if(i==26)type("a","3/2");
                else if(i==27)type("a","6");
                else if(i==28)type("a","-2");
                else if(i==29)type("a","2");
                else if(i>=76)yearTwoTest(i);
                else if(i>=31)foundationTest(i);
                else choose("a","0");
                js("document.querySelector('#answer-form').requestSubmit()");
            }
            await("location.hash==='#test/overview'");
            click("[data-action='finish-test']");
            await("!!document.querySelector('.test-score')");
            assertEquals(Boolean.TRUE,js("document.querySelector('.test-score strong').textContent==='130 / 130'"));

            // Real Android document picker: export, reset, import the same JSON.
            route("#data");
            click("[data-action='export']");
            UiObject filename=device.findObject(new UiSelector().className("android.widget.EditText"));
            assertTrue("Save document picker",filename.waitForExists(30000));
            filename.setText("SYN-Study-device-test.json");
            UiObject save=device.findObject(new UiSelector().textMatches("(?i)save"));
            assertTrue("Save button",save.waitForExists(30000));save.click();
            await("document.querySelector('#toast').textContent==='Файл сохранён.'");
            click("[data-action='ask-reset']");click("[data-action='confirm-reset']");
            await("document.querySelector('.footer').textContent.includes('0 / 130 с первой')");
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
            await("document.querySelector('.footer').textContent.includes('129 / 130 с первой')");
            route("#task/s-sequences-1");
            await("document.querySelector('#field-a')?.value==='3/2'");
            assertEquals(Boolean.TRUE,js("!!document.querySelector('.solution-panel')"));
            click("[data-action='cheatsheet']");
            await("document.querySelector('#cheatsheet')?.open===true");
            click("#cheatsheet details:has(.angle-table) summary");
            await("document.querySelector('.angle-table')?.closest('details').open===true");
            assertEquals(Boolean.TRUE,js("document.querySelector('.angle-table').textContent.includes('60°')"));
            device.pressBack();
            await("!document.querySelector('#cheatsheet').open");
            assertEquals("#task/s-sequences-1",js("location.hash"));
            assertEquals("3/2",js("document.querySelector('#field-a').value"));
            route("#proof/bolzano-weierstrass");
            await("document.querySelectorAll('.proof-reader .step-reason').length===7");
            route("#results");
            assertEquals(Boolean.TRUE,js("document.querySelector('.test-score strong').textContent==='130 / 130'"));

            click("[data-action='glossary']");await("!!document.querySelector('dialog[open]')");
            device.pressBack();await("!document.querySelector('dialog[open]')");
            assertEquals("#results",js("location.hash"));
        } finally {
            UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).executeShellCommand(
                "screencap -p /sdcard/Download/SYN-Study-last.png");
            scenario.close();
        }
    }
}
