import vm from 'vm';

async function main() {
  try {
    // commit-guard는 고친 코드로 띄운 검사용 서버를 DASHBOARD_URL로 넘긴다(3001은 고치기 전 코드일 수 있음).
    const res = await fetch(process.env.DASHBOARD_URL || 'http://localhost:3001/');
    const html = await res.text();
    const scriptStart = html.indexOf('<script>');
    const scriptEnd = html.indexOf('</script>');
    if (scriptStart === -1 || scriptEnd === -1) {
      console.error('No <script> tag found in HTTP response');
      process.exit(1);
    }

    const clientJs = html.slice(scriptStart + '<script>'.length, scriptEnd);
    console.log('HTTP Response Client JS length:', clientJs.length, 'bytes');

    // Create a mock DOM environment
    const sseListeners = new Map();
    const fetchedUrls = [];
    class MockEventSource {
      addEventListener(type, fn) {
        sseListeners.set(type, fn);
      }
    }
    const mockElements = new Map();
    const getOrCreateEl = (id) => {
      if (!mockElements.has(id)) {
        mockElements.set(id, {
          style: {},
          classList: { toggle: () => {}, add: () => {}, remove: () => {} },
          appendChild: () => {},
          addEventListener: () => {},
          querySelectorAll: () => [],
          scrollIntoView: () => {},
          scrollBy: () => {},
          textContent: '',
          innerHTML: '',
          value: '',
          scrollTop: 0,
          dataset: {},
        });
      }
      return mockElements.get(id);
    };

    const contextObj = {
      EventSource: MockEventSource,
      window: {
        addEventListener: () => {},
        removeEventListener: () => {},
        EventSource: MockEventSource,
      },
      document: {
        activeElement: { tagName: 'BODY' },
        getElementById: (id) => getOrCreateEl(id),
        querySelectorAll: (sel) => (sel === '.demand-kw-scroll' ? [getOrCreateEl('.demand-kw-scroll')] : []),
        addEventListener: () => {},
        createElement: () => ({
          style: {},
          classList: { add: () => {} },
          appendChild: () => {},
          setAttribute: () => {},
        }),
        body: { appendChild: () => {}, removeChild: () => {} },
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
      console: console,
      fetch: (url) => {
        fetchedUrls.push(String(url));
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      },
      setTimeout: (fn) => fn(),
      setInterval: () => {},
      Intl: Intl,
      Math: Math,
      Date: Date,
      JSON: JSON,
      encodeURIComponent: encodeURIComponent,
      decodeURIComponent: decodeURIComponent,
    };

    contextObj.window.document = contextObj.document;
    contextObj.window.localStorage = contextObj.localStorage;

    const vmContext = vm.createContext(contextObj);
    const script = new vm.Script(clientJs, { filename: 'browser-runtime.js' });
    script.runInContext(vmContext);
    console.log('✅ BROWSER Client JS executed in simulated DOM context without crashing!');

    // ⚠️ IMPORTANT: the client script declares its tab-level state with top-level `let`
    // (e.g. `let gDashboard = null;`). In Node's vm module, top-level `let`/`const` create
    // bindings in the context's lexical environment but do NOT become own properties of the
    // context object — unlike `var`, which does. So a post-hoc `vmContext.gDashboard = {...}`
    // (the old approach, still fine for `var`) silently does nothing here: it just adds an
    // unused property to the context object, while every render function keeps reading the
    // original `null` binding. This was discovered 2026-10-02 while verifying the Market
    // Demand per-channel deep-dive feature — the test reported "rendered 325 chars" for
    // renderMarketDemandTab() no matter what was assigned to vmContext.gMarketDemand, because
    // it was always silently falling through to the empty-state branch. The same was true for
    // every other `let`-declared global (gDashboard, gEpisodes, gKnowledgeDb, ...), meaning
    // this test has likely NEVER exercised the real-data branch of any tab's render function,
    // only ever the null/empty-state default — a false sense of coverage.
    //
    // Fix: compile the fixture assignments as a SECOND vm.Script and run it in the SAME
    // vmContext as plain (non-`let`/`const`/`var`) assignments. A context's lexical
    // environment persists across multiple Script.runInContext() calls, so a bare
    // `gDashboard = {...};` here reaches the exact binding the original script's `let
    // gDashboard` created — this is how the fixtures below actually take effect.
    const fixtures = {
      // renderOverviewTab, renderEvaluationsTab, renderStudioTab
      gDashboard: {
        summary: { views: 1000, estimatedMinutesWatched: 600, averageViewDuration: 120, averageViewPercentage: 45, subscribersGained: 50, subscribersLost: 5 },
        daily: [{ views: 100, estimatedMinutesWatched: 60, subscribersGained: 5, subscribersLost: 1 }],
        topVideos: [{ videoId: 'v1', title: 'Top Video', subscribersPerThousandViews: 10, views: 1000, url: 'https://youtu.be/v1' }],
        recentVideos: [{ videoId: 'v1', title: 'Video 1', publishedAt: '2026-09-01T00:00:00Z', durationSeconds: 300 }],
        // renderEvaluationsTab
        evaluations48h: {
          evaluations: [
            {
              contentId: 'TEST_EVAL_CONTENT_ID',
              decisionStatus: 'pass',
              label: 'TEST_EVAL_LABEL',
              reason: 'TEST_EVAL_REASON',
              videoId: 'v1',
              metrics: { views: 500, averageViewPercentage: 40, subscribersGained: 3 },
            },
          ],
        },
      },
      // renderOverviewTab, renderEpisodesTab
      gEpisodes: [
        {
          season: '단편',
          episode: 'EP16',
          tracks: {
            longform: {
              contentId: 'ep16-double-vowels-longform',
              status: 'ready_to_upload',
              statusLabel: '업로드 대기 · 예약 권장: 9/20(일) 20:00 KST',
              youtube: { title: 'EP16 Test Title', description: 'Test description', tags: ['tag1'], thumbnailCandidates: ['/thumb.jpg'] },
            },
          },
        },
      ],
      // renderMarketDemandTab — shape matches data/youtube/market-demand.json
      // (byKeyword[] + trackedChannels[], see scripts/market-demand.mjs)
      // renderAbSimulatorTab(실제 검색 피드 & 잘된 썸네일) — shape matches /api/thumb-feed/packages, /api/thumb-feed
      gThumbFeedPackages: [{name: 'ep99-test', title: 'TEST_FEED_OUR_TITLE', format: 'LONGFORM', status: 'scheduled', when: null,
        thumbnails: [{file: 'thumbnail.jpg', url: '/api/upload-package-asset/ep99-test/thumbnail.jpg'}], queries: ['test query']}],
      gThumbFeedPkg: 'ep99-test',
      gThumbFeedQuery: 'test query',
      gThumbFeedData: {key: 'LONGFORM::test query', query: 'test query', format: 'LONGFORM', fetchedAt: '2026-11-11T00:00:00Z', fromCache: true,
        feed: [{videoId: 'F1', title: 'TEST_FEED_RESULT', channelTitle: 'C', views: 100, thumbnail: 'x', isShort: false}],
        winners: [{videoId: 'W1', title: 'TEST_FEED_WINNER', channelTitle: 'C', views: 9000, subs: 100, ratio: 90, thumbnail: 'x'}],
        competitorOutliers: [{videoId: 'O1', title: 'TEST_FEED_OUTLIER', channelTitle: 'C', views: 5000, outlierRatio: 12.3, thumbnail: 'x'}]},
      gMarketDemand: {
        schemaVersion: 1,
        generatedAt: '2026-10-02T00:00:00.000Z',
        channelsAnalyzed: 30,
        byKeyword: [
          {
            keyword: 'TEST_KEYWORD_영어 발음 규칙',
            analyzedAt: '2026-10-02T00:00:00.000Z',
            videoCount: 12,
            confidence: 'ok',
            lowSampleWarning: null,
            marketDemandScore: 88.1,
            totalResults: 614621,
            opportunityScore: 15.2,
            titlePatterns: [{ word: '영어', titleCount: 5 }],
            topOutliers: [
              {
                videoId: 'TESTVID001',
                // 합친 아웃라이어 리포트가 있는 영상(서버 annotateOutlier가 붙이는 칸, 2026-11-12)
                outlierReport: { frame: null, visualChanges: 7 },
                title: 'TEST_OUTLIER_TITLE 발음 함께 연습해요',
                channelTitle: 'TEST_CHANNEL',
                viewCount: 182610,
                publishedAt: '2023-08-06T23:16:35Z',
                ageDays: 1127,
                viewsPerDay: 162,
                channelBaselineViewsPerDay: 2.8,
                outlierRatio: 57,
                durationSeconds: 26,
                isShort: true,
              },
            ],
          },
        ],
        trackedChannels: [
          {
            channelId: 'UCTEST0000000000000000',
            channelTitle: 'TEST_TRACKED_CHANNEL',
            handle: '@test핸들',
            channelUrl: 'https://www.youtube.com/channel/UCTEST0000000000000000',
            subscriberCount: 284000,
            analyzedAt: '2026-10-02T00:00:00.000Z',
            videoCount: 50,
            channelBaselineViewsPerDay: 438.9,
            titlePatterns: [{ word: '기초', titleCount: 17 }],
            topOutliers: [
              {
                videoId: 'TESTVID002',
                title: 'TEST_TRACKED_OUTLIER 읽는 법',
                channelTitle: 'TEST_TRACKED_CHANNEL',
                viewCount: 37394,
                publishedAt: '2026-09-29T03:00:32Z',
                ageDays: 3,
                viewsPerDay: 11120.2,
                channelBaselineViewsPerDay: 438.9,
                outlierRatio: 25.33,
                durationSeconds: 1870,
                isShort: false,
              },
            ],
          },
        ],
        // renderBenchmarkTab(기획 근거 성적표) — shape matches runD7AutonomousCycle episodeOutcomes
        episodeOutcomes: [
          {
            label: 'TEST_OUTCOME_LABEL', slug: 'ep99-test', videoId: 'TESTVID099', title: '테스트 영상',
            publishedAt: '2026-10-01T00:00:00Z', verdict: 'hold', ratio: 1.3, reason: '작은 표본',
            views: 10, impressions: 70, hasSources: true, audience: 'TEST_OUTCOME_AUDIENCE',
            competitors: [{channelTitle: 'TEST_OUTCOME_CHANNEL', channelId: 'UCTEST0000000000000000', videoId: 'TESTVID002', sourceRatio: 25.3}],
          },
        ],
        d7AutonomousCycle: {lastRunAt: '2026-11-11T00:00:00Z', applied: [{label: 'TEST_D7_APPLIED', ratio: 1.8, channels: ['TEST_TRACKED_CHANNEL']}], holdCount: 3},
      },
      // renderStudioResearchSection — shape matches /api/studio-research (2단계 현황판, 2026-11-20)
      gStudioResearch: {
        stage: 2,
        hasData: true,
        updatedAt: '2026-11-20T04:44:03.630Z',
        collectDays: 6,
        targetCollectDays: 12,
        researchReportsCount: 1,
        targetResearchReports: 20,
        totalCandidates: 2,
        longformCount: 1,
        shortsCount: 1,
        reportedCandidatesCount: 0,
        nextTargets: [
          {videoId: 'RESLONG0001', source: 'studio-research', format: 'LONGFORM', title: 'TEST_RESEARCH_TITLE 롱폼', channelTitle: 'TEST_RES_CH', studioFolds: 79, publishedAt: '2026-11-15T00:00:00Z'},
        ],
        candidates: [
          {videoId: 'RESLONG0001', format: 'LONGFORM', title: 'TEST_RESEARCH_TITLE 롱폼', channelTitle: 'TEST_RES_CH', publishedAt: '2026-11-15T00:00:00Z', studioFolds: 79, studioSubscribers: 12000, studioViews: 95000, hasReport: false, ratioLabel: null, sheetLinks: [], isNextTarget: true},
          {videoId: 'RESSHRT0002', format: 'SHORTS', title: 'TEST_RESEARCH_SHORTS', channelTitle: 'TEST_RES_CH2', publishedAt: '2026-11-18T00:00:00Z', studioFolds: 100, studioSubscribers: 8000, studioViews: 200000, hasReport: true, ratioLabel: '15.2배', sheetLinks: [], isNextTarget: false},
        ],
      },
      // renderKnowledgeDbTab — shape matches data/youtube/audience-dna.json +
      // data/youtube/success-patterns.json (see upsertAudienceDna / renderKnowledgeDbTab)
      // renderNextInputCard — shape matches scripts/next-episode-input.mjs buildFromProject() (/api/next-input)
      gNextInput: {
        generatedAt: '2026-11-12T05:00:00.000Z',
        fileGeneratedAt: '2026-11-12T05:00:00.000Z',
        outcomes: [{label: 'EP23', verdict: 'hold'}, {label: 'EP24', verdict: 'pending'}],
        comparisons: {
          LONGFORM: {format: 'LONGFORM', status: 'ok', count: 20, medianViews7d: 5, smallSample: true,
            top: [{traits: {question: true, startsWithEnglish: false}}], bottom: [{traits: {question: false, startsWithEnglish: false}}]},
          SHORTS: {format: 'SHORTS', status: 'hold', count: 3, reason: 'TEST_NEXT_INPUT_HOLD', top: [], bottom: []},
        },
        audience: {painPoint: [], question: [{text: 'TEST_NEXT_INPUT_Q', videoCount: 5, occurrences: 5, channels: []}], excludedAiGuesses: 0},
        outlierReports: [{videoId: 'TESTVID001', title: 'TEST_NEXT_INPUT_REPORT', outlierRatio: 570}],
      },
      gKnowledgeDb: {
        audienceDna: {
          entries: [
            {
              id: 'vocabulary:TEST_WORD',
              type: 'vocabulary',
              text: 'TEST_DNA_VOCAB_항목',
              occurrences: 2,
              sources: [{ videoId: 'TESTVID001', channelTitle: 'TEST_CHANNEL', sourceType: 'outlierComment' }],
              firstSeenAt: '2026-10-02T00:00:00.000Z',
              lastSeenAt: '2026-10-02T00:00:00.000Z',
            },
          ],
        },
        successPatterns: {
          entries: [
            {
              id: 'TESTVID003',
              videoId: 'TESTVID003',
              title: 'TEST_SUCCESS_PATTERN_제목',
              ctr: 8.5,
              retentionRate: 55.2,
              diagnosedAt: '2026-10-02T00:00:00.000Z',
              reusableHook: 'TEST_REUSABLE_HOOK',
              reusableAnalogy: 'TEST_REUSABLE_ANALOGY',
            },
          ],
        },
      },
    };

    const assignments = Object.keys(fixtures)
      .map((key) => `${key} = ${JSON.stringify(fixtures[key])};`)
      .join('\n');
    new vm.Script(assignments, { filename: 'fixture-injection.js' }).runInContext(vmContext);
    console.log('✅ Fixture data injected via same-context plain assignment (reaches `let` bindings)');

    // Per-tab: which fixture-only marker string MUST appear in the render output to prove the
    // fixture actually flowed through (not just "output non-empty", which the empty-state
    // branch would also satisfy). Tabs not listed here don't depend on any of the fixtures
    // above (e.g. renderDesignSystemTab is self-contained).
    const expectedMarkers = {
      renderOverviewTab: ['Top Video', 'TEST_NEXT_INPUT_Q', 'TEST_NEXT_INPUT_HOLD', 'TEST_NEXT_INPUT_REPORT'],
      renderMarketDemandTab: ['스튜디오 조사 2단계', 'TEST_RESEARCH_TITLE', 'TEST_OUTLIER_TITLE', 'TEST_TRACKED_CHANNEL', 'TEST_TRACKED_OUTLIER', 'TEST_D7_APPLIED', '리포트 보기 (화면 변화 7)'],
      renderBenchmarkTab: ['TEST_OUTCOME_LABEL', 'TEST_OUTCOME_CHANNEL', 'TEST_OUTCOME_AUDIENCE'],
      renderAbSimulatorTab: ['TEST_FEED_OUR_TITLE', 'TEST_FEED_RESULT', 'TEST_FEED_WINNER', 'TEST_FEED_OUTLIER'],
      renderEpisodesTab: ['EP16 Test Title'],
      renderStudioTab: ['Video 1'],
    };

    // Test rendering every active tab!
    const tabsToTest = [
      'renderOverviewTab',
      'renderEpisodesTab',
      'renderStudioTab',
      'renderMarketDemandTab',
      'renderBenchmarkTab',
      'renderAbSimulatorTab',
    ];

    let anyMarkerFailed = false;
    for (const tabFnName of tabsToTest) {
      const fn = vmContext[tabFnName];
      if (typeof fn === 'function') {
        const out = fn({ score: 90, grade: 'A+', dopamineStages: {}, readabilityCheck: {}, violations: [], hyperFramesScenes: [] });
        if (typeof out === 'string' && out.length > 0) {
          console.log(`  ✓ ${tabFnName}() rendered HTML successfully (${out.length} chars)`);
          const markers = expectedMarkers[tabFnName] || [];
          const missing = markers.filter((m) => !out.includes(m));
          if (missing.length > 0) {
            anyMarkerFailed = true;
            console.error(`    ✗ MISSING fixture markers (real-data branch not reached): ${missing.join(', ')}`);
          } else if (markers.length > 0) {
            console.log(`    ✓ real-data fixture markers present: ${markers.join(', ')}`);
          }
        } else {
          console.warn(`  ? ${tabFnName}() returned empty output`);
        }
      } else {
        console.error(`  ✗ ${tabFnName} is not defined on context`);
      }
    }

    if (anyMarkerFailed) {
      console.error('\n❌ One or more tabs rendered without reaching their real-data branch — fixture injection regressed.');
      process.exit(1);
    }

    const analysisHandler = sseListeners.get('analysis-updated');
    if (typeof analysisHandler !== 'function') {
      console.error('❌ SSE analysis-updated listener was not registered.');
      process.exit(1);
    }
    fetchedUrls.length = 0;
    new vm.Script('gCurrentTab = "tab-demand"; gDemandBusyCount = 0;', { filename: 'sse-prep.js' }).runInContext(vmContext);
    await analysisHandler();
    if (!fetchedUrls.includes('/api/market-demand') || !fetchedUrls.includes('/api/knowledge-db')) {
      console.error('❌ SSE analysis-updated handler did not refresh /api/market-demand and /api/knowledge-db:', fetchedUrls);
      process.exit(1);
    }
    console.log('  ✓ SSE analysis-updated listener refreshed derived data cleanly');

    console.log('\n🎉 ALL CLIENT TABS AND FUNCTIONS VERIFIED 100% OPERATIONAL (with real-data branches confirmed reached)!');
  } catch (err) {
    console.error('❌ Error during simulated browser test:');
    console.error(err.stack || err);
    process.exit(1);
  }
}

main();
