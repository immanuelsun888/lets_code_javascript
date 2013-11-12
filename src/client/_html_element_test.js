// Copyright (c) 2013 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.

(function() {
	"use strict";

	var HtmlElement = require("./html_element.js");
	var browser = require("./browser.js");

	describe("HtmlElement", function() {
		var windowElement;
		var bodyElement;
		var htmlElement;

		beforeEach(function() {
			windowElement = new HtmlElement(window);
			bodyElement = new HtmlElement(document.body);
			htmlElement = HtmlElement.fromHtml("<div></div>");
		});

		afterEach(function() {
			if (browser.supportsCaptureApi()) htmlElement.releaseCapture();
			windowElement.removeAllEventHandlers();
			bodyElement.removeAllEventHandlers();
			htmlElement.removeAllEventHandlers();
		});

		describe("event handling", function() {

			describe("mouse events", function() {
				it("triggers mouse events relative to element and handles them relative to page", function() {
					testEvent(htmlElement.onSelectStart_ie8Only, htmlElement.doSelectStart);
					testEvent(htmlElement.onMouseDown, htmlElement.doMouseDown);
					testEvent(htmlElement.onMouseMove, htmlElement.doMouseMove);
					testEvent(htmlElement.onMouseLeave, htmlElement.doMouseLeave);
					testEvent(htmlElement.onMouseUp, htmlElement.doMouseUp);
				});

				it("allows mouse events to be triggered without coordinates", function() {
					var monitor = monitorEvent(htmlElement, htmlElement.onMouseDown);
					htmlElement.doMouseDown();
					expect(monitor.eventTriggeredAt).to.eql({ x: 0, y: 0 });
				});

				it("simulates buggy IE 8 behavior (where mouse events on window aren't sent to window object)", function() {
					if (!browser.doesNotHandlesUserEventsOnWindow()) return;

					var monitor = monitorEvent(windowElement, windowElement.onMouseUp);
					windowElement.doMouseUp();
					expect(monitor.eventTriggered).to.be(false);
				});
			});

			describe("touch events", function() {
				if (!browser.supportsTouchEvents()) return;

				it("handles single-touch events", function() {
					testEvent(htmlElement.onSingleTouchStart, htmlElement.doSingleTouchStart);
					testEvent(htmlElement.onSingleTouchMove, htmlElement.doSingleTouchMove);
					testEvent(htmlElement.onSingleTouchEnd, htmlElement.doSingleTouchEnd);
					testEvent(htmlElement.onSingleTouchCancel, htmlElement.doSingleTouchCancel);
				});

				it("handles multi-touch events", function() {
					var monitor = monitorEvent(htmlElement, htmlElement.onMultiTouchStart);
					htmlElement.doMultiTouchStart(1, 2, 3, 4);
					expect(monitor.eventTriggered).to.be(true);
				});

				it("allows touch events to be triggered without coordinates", function() {
					var monitor = monitorEvent(htmlElement, htmlElement.onSingleTouchStart);
					htmlElement.doSingleTouchStart();
					expect(monitor.eventTriggeredAt).to.eql({ x: 0, y: 0});
				});
			});

			describe("Capture API", function() {
				if (!browser.supportsCaptureApi()) return;

				it("emulates behavior of setCapture() (on browsers that support it)", function() {
					var monitor = monitorEvent(htmlElement, htmlElement.onMouseMove);
					htmlElement.setCapture();
					bodyElement.doMouseMove();
					expect(monitor.eventTriggered).to.be(true);
				});

				it("emulates behavior of releaseCapture() (on browsers that support it)", function() {
					var monitor = monitorEvent(htmlElement, htmlElement.onMouseMove);
					htmlElement.setCapture();
					htmlElement.releaseCapture();
					bodyElement.doMouseMove();
					expect(monitor.eventTriggered).to.be(false);
				});
			});

			it("clears all event handlers (useful for testing)", function() {
				htmlElement.onMouseDown(function() {
					throw new Error("event handler should have been removed");
				});

				htmlElement.removeAllEventHandlers();
				htmlElement.doMouseDown(0, 0);
			});

			function monitorEvent(htmlElement, eventFunction) {
				var monitor = {
					eventTriggered: false
				};

				eventFunction.call(htmlElement, function(pageOffset) {
					monitor.eventTriggered = true;
					monitor.eventTriggeredAt = pageOffset;
				});
				return monitor;
			}

			function testEvent(eventSender, eventHandler) {
				try {
					htmlElement.appendSelfToBody();

					var eventPageOffset = null;
					eventSender.call(htmlElement, function(pageOffset) {
						eventPageOffset = pageOffset;
					});
					eventHandler.call(htmlElement, 42, 13);
					expect(htmlElement.relativeOffset(eventPageOffset)).to.eql({ x: 42, y: 13});
				}
				finally {
					htmlElement.remove();
				}
			}
		});

		describe("coordinate conversion", function() {

			it("converts page coordinates into relative element coordinates", function() {
				try {
					htmlElement.appendSelfToBody();
					var offset = htmlElement.relativeOffset({x: 100, y: 150});

					if (browser.reportsElementPositionOffByOneSometimes()) {
						// compensate for off-by-one error in IE 8
						expect(offset.x).to.equal(92);
						expect(offset.y === 141 || offset.y === 142).to.be(true);
					}
					else {
						expect(offset).to.eql({x: 92, y: 142});
					}
				} finally {
					htmlElement.remove();
				}
			});

			it("converts relative coordinates into page coordinates", function() {
				try {
					htmlElement.appendSelfToBody();
					var offset = htmlElement.pageOffset({x: 100, y: 150});

					if (browser.reportsElementPositionOffByOneSometimes()) {
						// compensate for off-by-one error in IE 8
						expect(offset.x).to.equal(108);
						expect(offset.y === 158 || offset.y === 159).to.be(true);
					}
					else {
						expect(offset).to.eql({x: 108, y: 158});
					}
				} finally {
					htmlElement.remove();
				}
			});
		});

		describe("DOM manipulation", function() {

			it("creates element from raw HTML; also, converts to DOM element", function() {
				var element = HtmlElement.fromHtml("<code>foo</code>");

				var domElement = element.toDomElement();

				expect(domElement.outerHTML.toLowerCase()).to.equal("<code>foo</code>");

				// Ensure that fromHtml converts HTML to DOM element, not jQuery element
				expect(element._domElement).to.equal(domElement);
			});

			it("appends elements", function() {
				htmlElement.append(HtmlElement.fromHtml("<div></div>"));
				expect(htmlElement._element.children().length).to.equal(1);
			});

			it("appends to body", function() {
				try {
					var childrenBeforeAppend = bodyElement._element.children().length;

					htmlElement.appendSelfToBody();
					var childrenAfterAppend = bodyElement._element.children().length;
					expect(childrenBeforeAppend + 1).to.equal(childrenAfterAppend);
				} finally {
					htmlElement.remove();
				}
			});

			it("removes elements", function() {
				var elementToAppend = HtmlElement.fromHtml("<div></div>");
				htmlElement.append(elementToAppend);
				elementToAppend.remove();
				expect(htmlElement._element.children().length).to.equal(0);
			});
		});

	});

}());