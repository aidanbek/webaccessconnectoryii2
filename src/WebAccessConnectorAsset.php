<?php

namespace aidanbek\webAccessConnectorYii2;

use Yii;
use yii\web\AssetBundle;

class WebAccessConnectorAsset extends AssetBundle
{
    /**
     * @inheritdoc
     */
    public $sourcePath = '@vendor/aidanbek/webAccessConnectorYii2/src';

    /**
     * @inheritdoc
     */
    public function registerAssetFiles($view)
    {
        $this->js[] = 'webAccessConnector-1.1.js';
        parent::registerAssetFiles($view);
    }
}
