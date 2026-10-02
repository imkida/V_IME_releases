import { Fragment } from 'react';

function InlineText({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <Fragment key={index}>{part}</Fragment>
  );
}

export default function ReleaseNotes({ notes, releaseUrl }) {
  let firstParagraph = true;
  return <div className="release-detail">
    <p className="release-platform">Vime for macOS <span>公开测试版</span></p>
    <div className="release-body">
      {notes.map((block, index) => {
        if (block.type === 'metadata') {
          return <p key={index} className="release-metadata"><InlineText text={block.text}/></p>;
        }
        if (block.type === 'heading') {
          return <h4 key={index}><InlineText text={block.text}/></h4>;
        }
        if (block.type === 'list') {
          return <ul key={index}>{block.items.map((item, itemIndex) =>
            <li key={itemIndex}><InlineText text={item}/></li>
          )}</ul>;
        }
        const overview = firstParagraph;
        firstParagraph = false;
        return <p key={index} className={overview ? 'release-overview' : undefined}>
          <InlineText text={block.text}/>
        </p>;
      })}
    </div>
    <a className="release-original" href={releaseUrl}>查看完整发布说明 <span aria-hidden="true">↗</span></a>
  </div>;
}
